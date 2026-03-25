"""Reports views -- report generation, export download, export history."""
import logging
from decimal import Decimal
from datetime import date

from django.core.files.base import ContentFile
from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.projects.models import Project

from .models import ReportExport
from .serializers import ReportExportSerializer
from .services import REPORT_ASSEMBLERS, EXPORT_GENERATORS

logger = logging.getLogger(__name__)


def _get_project_or_404(request, project_id):
    try:
        project = Project.objects.get(pk=project_id)
    except Project.DoesNotExist:
        return None
    if project.organisation_id != request.user.organisation_id:
        return None
    if not request.user.has_project_perm(project, "project.view"):
        return None
    return project


def _can_view_reports(request, project):
    return request.user.has_project_perm(project, "reports.view")


def _can_export(request, project):
    return request.user.has_project_perm(project, "reports.export")


def _mark_export_failed(export: ReportExport, user):
    """Persist a failed export state and clear any dangling file reference."""
    update_fields = ["status", "updated_by", "updated_at"]
    if export.file:
        export.file.delete(save=False)
        export.file = ""
        update_fields.append("file")
    export.status = "failed"
    export.updated_by = user
    export.save(update_fields=update_fields)


# ---------------------------------------------------------------------------
# Available reports
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def available_reports(request, project_id):
    """List available report types for a project."""
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if not _can_view_reports(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    reports = []
    for key, label in ReportExport.REPORT_KEY_CHOICES:
        reports.append({
            "key": key,
            "label": label,
            "formats": ["csv", "xlsx", "pdf", "docx"],
        })
    return Response(reports)


# ---------------------------------------------------------------------------
# Inline report data (JSON, no file download)
# ---------------------------------------------------------------------------

def _serialise_value(v):
    """Make a value JSON-safe."""
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, date):
        return v.isoformat()
    return v


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def report_data(request, project_id):
    """Return inline report data for the frontend report viewer."""
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if not _can_view_reports(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    report_key = request.query_params.get("key", "schedule")
    if report_key not in REPORT_ASSEMBLERS:
        return Response({"detail": f"Unknown report: {report_key}"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        data = REPORT_ASSEMBLERS[report_key](project)
    except Exception:
        logger.exception("Report data assembly failed for %s/%s", project_id, report_key)
        return Response({"detail": "Failed to assemble report data."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Ensure all row values are JSON-serialisable
    rows = [[_serialise_value(v) for v in row] for row in data["rows"]]
    return Response({
        "title": data["title"],
        "headers": data["headers"],
        "rows": rows,
        "summary": data.get("summary", ""),
    })


# ---------------------------------------------------------------------------
# Generate export (synchronous for now -- can move to Celery later)
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_export(request, project_id):
    """Generate and return an export file for a specific report type and format."""
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if not _can_export(request, project):
        return Response({"detail": "Export permission required."}, status=status.HTTP_403_FORBIDDEN)

    report_key = request.data.get("report_key", "")
    export_format = request.data.get("format", "csv")

    if report_key not in REPORT_ASSEMBLERS:
        return Response({"detail": f"Unknown report key: {report_key}"}, status=status.HTTP_400_BAD_REQUEST)
    if export_format not in EXPORT_GENERATORS:
        return Response({"detail": f"Unsupported format: {export_format}"}, status=status.HTTP_400_BAD_REQUEST)

    ext = {"csv": ".csv", "xlsx": ".xlsx", "pdf": ".pdf", "docx": ".docx"}[export_format]
    file_name = f"{project.code}_{report_key}{ext}"

    export_record = ReportExport.objects.create(
        organisation=project.organisation,
        project=project,
        scope="project",
        report_key=report_key,
        format=export_format,
        status="pending",
        row_count=0,
        file_name=file_name,
        created_by=request.user,
        updated_by=request.user,
    )

    try:
        assembler = REPORT_ASSEMBLERS[report_key]
        data = assembler(project)

        generator = EXPORT_GENERATORS[export_format]
        content_bytes, content_type = generator(data)

        export_record.row_count = len(data["rows"])
        export_record.file.save(file_name, ContentFile(content_bytes), save=False)
        export_record.status = "completed"
        export_record.updated_by = request.user
        export_record.save(update_fields=["file", "status", "row_count", "updated_by", "updated_at"])
    except Exception:
        logger.exception(
            "Report export failed for project %s (%s) [%s/%s]",
            project.id,
            project.code,
            report_key,
            export_format,
        )
        _mark_export_failed(export_record, request.user)
        return Response(
            {"detail": "Failed to generate export."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Return the file as download
    response = HttpResponse(content_bytes, content_type=content_type)
    response["Content-Disposition"] = f'attachment; filename="{file_name}"'
    return response


# ---------------------------------------------------------------------------
# Export history
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def export_history(request, project_id):
    """List recent export history for a project."""
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if not _can_view_reports(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    exports = ReportExport.objects.filter(project=project).select_related("created_by")[:20]
    return Response(ReportExportSerializer(exports, many=True).data)


# ---------------------------------------------------------------------------
# Re-download a past export
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def export_download(request, project_id, export_id):
    """Download a previously generated export file."""
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if not _can_view_reports(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    try:
        export = ReportExport.objects.get(pk=export_id, project=project)
    except ReportExport.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if not export.file or not export.file.name:
        _mark_export_failed(export, request.user)
        return Response({"detail": "Export file not available."}, status=status.HTTP_404_NOT_FOUND)

    if not export.file.storage.exists(export.file.name):
        _mark_export_failed(export, request.user)
        return Response({"detail": "Export file no longer exists."}, status=status.HTTP_404_NOT_FOUND)

    ext_map = {"csv": "text/csv", "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
               "pdf": "application/pdf", "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}

    try:
        file_bytes = export.file.read()
    except OSError:
        logger.exception("Failed to read export file %s for report export %s", export.file.name, export.id)
        _mark_export_failed(export, request.user)
        return Response({"detail": "Export file could not be opened."}, status=status.HTTP_404_NOT_FOUND)

    response = HttpResponse(file_bytes, content_type=ext_map.get(export.format, "application/octet-stream"))
    response["Content-Disposition"] = f'attachment; filename="{export.file_name}"'
    return response
