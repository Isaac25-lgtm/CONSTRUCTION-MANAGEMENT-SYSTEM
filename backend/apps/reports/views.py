"""Reports views -- report generation, export download, export history."""
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

    # Assemble data
    assembler = REPORT_ASSEMBLERS[report_key]
    data = assembler(project)

    # Generate file
    generator = EXPORT_GENERATORS[export_format]
    content_bytes, content_type = generator(data)

    # Save export record
    ext = {"csv": ".csv", "xlsx": ".xlsx", "pdf": ".pdf", "docx": ".docx"}[export_format]
    file_name = f"{project.code}_{report_key}{ext}"

    export_record = ReportExport.objects.create(
        organisation=project.organisation,
        project=project,
        scope="project",
        report_key=report_key,
        format=export_format,
        status="completed",
        row_count=len(data["rows"]),
        file_name=file_name,
        created_by=request.user,
        updated_by=request.user,
    )
    export_record.file.save(file_name, ContentFile(content_bytes), save=True)

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

    if not export.file:
        return Response({"detail": "Export file not available."}, status=status.HTTP_404_NOT_FOUND)

    ext_map = {"csv": "text/csv", "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
               "pdf": "application/pdf", "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}

    response = HttpResponse(export.file.read(), content_type=ext_map.get(export.format, "application/octet-stream"))
    response["Content-Disposition"] = f'attachment; filename="{export.file_name}"'
    return response
