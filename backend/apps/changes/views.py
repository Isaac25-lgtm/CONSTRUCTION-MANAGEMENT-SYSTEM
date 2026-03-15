"""Change Order views -- CRUD for change orders / variations."""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.projects.models import Project
from .models import ChangeOrder
from .serializers import ChangeOrderSerializer, ChangeOrderCreateSerializer


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


def _can_edit_changes(request, project):
    return request.user.has_project_perm(project, "changes.edit")


# ---------------------------------------------------------------------------
# Change Order List / Create
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def change_order_list(request, project_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        orders = ChangeOrder.objects.filter(project=project).select_related(
            "requested_by", "approved_by",
        )
        return Response(ChangeOrderSerializer(orders, many=True).data)

    if not _can_edit_changes(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = ChangeOrderCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    co = serializer.save(project=project, created_by=request.user)
    return Response(ChangeOrderSerializer(co).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Change Order Detail / Update / Delete
# ---------------------------------------------------------------------------

@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def change_order_detail(request, project_id, change_order_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    try:
        co = ChangeOrder.objects.select_related(
            "requested_by", "approved_by",
        ).get(pk=change_order_id, project=project)
    except ChangeOrder.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(ChangeOrderSerializer(co).data)

    if not _can_edit_changes(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    if request.method == "DELETE":
        co.soft_delete(user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = ChangeOrderSerializer(co, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save(updated_by=request.user)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_order_restore(request, project_id, change_order_id):
    """Restore a soft-deleted change order."""
    project = _get_project_or_404(request, project_id)
    if not project or not _can_edit_changes(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)
    try:
        co = ChangeOrder.all_objects.get(pk=change_order_id, project=project, is_deleted=True)
        co.restore()
        return Response({"detail": "Restored."})
    except ChangeOrder.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
