"""Risk views -- CRUD for the risk register."""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.projects.models import Project
from .models import Risk
from .serializers import RiskSerializer, RiskCreateSerializer


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


def _can_edit_risks(request, project):
    return request.user.has_project_perm(project, "risks.edit")


# ---------------------------------------------------------------------------
# Risk List / Create
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def risk_list(request, project_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        risks = Risk.objects.filter(project=project)
        return Response(RiskSerializer(risks, many=True).data)

    if not _can_edit_risks(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = RiskCreateSerializer(
        data=request.data,
        context={"request": request, "project": project},
    )
    serializer.is_valid(raise_exception=True)
    risk = serializer.save(project=project, created_by=request.user)
    return Response(RiskSerializer(risk).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Risk Detail / Update / Delete
# ---------------------------------------------------------------------------

@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def risk_detail(request, project_id, risk_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    try:
        risk = Risk.objects.get(pk=risk_id, project=project)
    except Risk.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(RiskSerializer(risk).data)

    if not _can_edit_risks(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    if request.method == "DELETE":
        risk.soft_delete(user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = RiskSerializer(
        risk,
        data=request.data,
        partial=True,
        context={"request": request, "project": project},
    )
    serializer.is_valid(raise_exception=True)
    serializer.save(updated_by=request.user)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def risk_restore(request, project_id, risk_id):
    """Restore a soft-deleted risk."""
    project = _get_project_or_404(request, project_id)
    if not project or not _can_edit_risks(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)
    try:
        risk = Risk.all_objects.get(pk=risk_id, project=project, is_deleted=True)
        risk.restore()
        return Response({"detail": "Restored."})
    except Risk.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
