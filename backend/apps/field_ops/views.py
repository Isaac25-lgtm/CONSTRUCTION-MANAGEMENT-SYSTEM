"""Field Operations views -- CRUD for punch items, daily logs, safety incidents, quality checks."""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.projects.models import Project
from .models import PunchItem, DailyLog, SafetyIncident, QualityCheck
from .serializers import (
    PunchItemSerializer, PunchItemCreateSerializer,
    DailyLogSerializer, DailyLogCreateSerializer,
    SafetyIncidentSerializer, SafetyIncidentCreateSerializer,
    QualityCheckSerializer, QualityCheckCreateSerializer,
)


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


def _can_edit_field_ops(request, project):
    return request.user.has_project_perm(project, "field_ops.edit")


# ---------------------------------------------------------------------------
# Punch Items
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def punch_item_list(request, project_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        items = PunchItem.objects.filter(project=project).select_related("assigned_to")
        return Response(PunchItemSerializer(items, many=True).data)

    if not _can_edit_field_ops(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = PunchItemCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    item = serializer.save(project=project, created_by=request.user)
    return Response(PunchItemSerializer(item).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def punch_item_detail(request, project_id, item_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    try:
        item = PunchItem.objects.select_related("assigned_to").get(pk=item_id, project=project)
    except PunchItem.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(PunchItemSerializer(item).data)

    if not _can_edit_field_ops(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    if request.method == "DELETE":
        item.soft_delete(user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = PunchItemSerializer(item, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save(updated_by=request.user)
    return Response(serializer.data)


# ---------------------------------------------------------------------------
# Daily Logs
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def daily_log_list(request, project_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        logs = DailyLog.objects.filter(project=project).select_related("author")
        return Response(DailyLogSerializer(logs, many=True).data)

    if not _can_edit_field_ops(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = DailyLogCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    log = serializer.save(project=project, created_by=request.user)
    return Response(DailyLogSerializer(log).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def daily_log_detail(request, project_id, log_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    try:
        log = DailyLog.objects.select_related("author").get(pk=log_id, project=project)
    except DailyLog.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(DailyLogSerializer(log).data)

    if not _can_edit_field_ops(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    if request.method == "DELETE":
        log.soft_delete(user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = DailyLogSerializer(log, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save(updated_by=request.user)
    return Response(serializer.data)


# ---------------------------------------------------------------------------
# Safety Incidents
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def safety_incident_list(request, project_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        incidents = SafetyIncident.objects.filter(project=project).select_related(
            "assigned_to", "reported_by",
        )
        return Response(SafetyIncidentSerializer(incidents, many=True).data)

    if not _can_edit_field_ops(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = SafetyIncidentCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    incident = serializer.save(project=project, created_by=request.user)
    return Response(SafetyIncidentSerializer(incident).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def safety_incident_detail(request, project_id, incident_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    try:
        incident = SafetyIncident.objects.select_related(
            "assigned_to", "reported_by",
        ).get(pk=incident_id, project=project)
    except SafetyIncident.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(SafetyIncidentSerializer(incident).data)

    if not _can_edit_field_ops(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    if request.method == "DELETE":
        incident.soft_delete(user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = SafetyIncidentSerializer(incident, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save(updated_by=request.user)
    return Response(serializer.data)


# ---------------------------------------------------------------------------
# Quality Checks
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def quality_check_list(request, project_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        checks = QualityCheck.objects.filter(project=project).select_related("inspector")
        return Response(QualityCheckSerializer(checks, many=True).data)

    if not _can_edit_field_ops(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = QualityCheckCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    check = serializer.save(project=project, created_by=request.user)
    return Response(QualityCheckSerializer(check).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def quality_check_detail(request, project_id, check_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    try:
        check = QualityCheck.objects.select_related("inspector").get(pk=check_id, project=project)
    except QualityCheck.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(QualityCheckSerializer(check).data)

    if not _can_edit_field_ops(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    if request.method == "DELETE":
        check.soft_delete(user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = QualityCheckSerializer(check, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save(updated_by=request.user)
    return Response(serializer.data)


# --- Restore endpoints ---

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def punch_item_restore(request, project_id, item_id):
    project = _get_project_or_404(request, project_id)
    if not project or not _can_edit_field_ops(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)
    try:
        item = PunchItem.all_objects.get(pk=item_id, project=project, is_deleted=True)
        item.restore()
        return Response({"detail": "Restored."})
    except PunchItem.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def daily_log_restore(request, project_id, log_id):
    project = _get_project_or_404(request, project_id)
    if not project or not _can_edit_field_ops(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)
    try:
        log = DailyLog.all_objects.get(pk=log_id, project=project, is_deleted=True)
        log.restore()
        return Response({"detail": "Restored."})
    except DailyLog.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def safety_incident_restore(request, project_id, incident_id):
    project = _get_project_or_404(request, project_id)
    if not project or not _can_edit_field_ops(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)
    try:
        inc = SafetyIncident.all_objects.get(pk=incident_id, project=project, is_deleted=True)
        inc.restore()
        return Response({"detail": "Restored."})
    except SafetyIncident.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def quality_check_restore(request, project_id, check_id):
    project = _get_project_or_404(request, project_id)
    if not project or not _can_edit_field_ops(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)
    try:
        qc = QualityCheck.all_objects.get(pk=check_id, project=project, is_deleted=True)
        qc.restore()
        return Response({"detail": "Restored."})
    except QualityCheck.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)


# --- Recycle Bin aggregate endpoint ---

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def recycle_bin(request, project_id):
    """Return all soft-deleted field-op records for a project."""
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    from apps.risks.models import Risk
    from apps.rfis.models import RFI
    from apps.changes.models import ChangeOrder

    items = []
    for model, type_key, type_label, name_field in [
        (Risk, "risk", "Risk", "title"),
        (RFI, "rfi", "RFI", "subject"),
        (ChangeOrder, "change_order", "Change Order", "title"),
        (PunchItem, "punch_item", "Punch Item", "title"),
        (DailyLog, "daily_log", "Daily Log", "work_performed"),
        (SafetyIncident, "safety_incident", "Safety Incident", "title"),
        (QualityCheck, "quality_check", "Quality Check", "title"),
    ]:
        for obj in model.all_objects.filter(project=project, is_deleted=True):
            items.append({
                "id": str(obj.id),
                "type": type_key,
                "type_label": type_label,
                "title": getattr(obj, name_field, "")[:100],
                "deleted_at": obj.deleted_at.isoformat() if obj.deleted_at else None,
                "deleted_by_name": obj.deleted_by.get_full_name() if obj.deleted_by else None,
            })

    items.sort(key=lambda x: x["deleted_at"] or "", reverse=True)
    return Response(items)
