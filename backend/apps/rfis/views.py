"""RFI views -- CRUD for requests for information."""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.projects.models import Project
from .models import RFI
from .serializers import RFISerializer, RFICreateSerializer


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


def _can_edit_rfis(request, project):
    return request.user.has_project_perm(project, "rfis.edit")


# ---------------------------------------------------------------------------
# RFI List / Create
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def rfi_list(request, project_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        rfis = RFI.objects.filter(project=project).select_related("raised_by", "assigned_to")
        return Response(RFISerializer(rfis, many=True).data)

    if not _can_edit_rfis(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = RFICreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    rfi = serializer.save(project=project, created_by=request.user)
    return Response(RFISerializer(rfi).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# RFI Detail / Update / Delete
# ---------------------------------------------------------------------------

@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def rfi_detail(request, project_id, rfi_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    try:
        rfi = RFI.objects.select_related("raised_by", "assigned_to").get(pk=rfi_id, project=project)
    except RFI.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(RFISerializer(rfi).data)

    if not _can_edit_rfis(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    if request.method == "DELETE":
        rfi.soft_delete(user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = RFISerializer(rfi, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save(updated_by=request.user)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def rfi_restore(request, project_id, rfi_id):
    """Restore a soft-deleted RFI."""
    project = _get_project_or_404(request, project_id)
    if not project or not _can_edit_rfis(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)
    try:
        rfi = RFI.all_objects.get(pk=rfi_id, project=project, is_deleted=True)
        rfi.restore()
        return Response({"detail": "Restored."})
    except RFI.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
