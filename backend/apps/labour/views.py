"""Labour views -- timesheet entries."""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.projects.models import Project
from .models import TimesheetEntry
from .serializers import TimesheetEntrySerializer, TimesheetEntryCreateSerializer


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


def _can_edit_labour(request, project):
    return request.user.has_project_perm(project, "labour.edit")


# ---------------------------------------------------------------------------
# Timesheet Entries
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def timesheet_entry_list(request, project_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        entries = TimesheetEntry.objects.filter(project=project).select_related(
            "resource", "approved_by",
        )
        return Response(TimesheetEntrySerializer(entries, many=True).data)

    if not _can_edit_labour(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = TimesheetEntryCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    # Validate resource is assigned to this project
    resource = serializer.validated_data.get("resource")
    if resource:
        from apps.resources.models import ProjectResourceAssignment
        if not ProjectResourceAssignment.objects.filter(project=project, resource=resource, status="active").exists():
            return Response({"detail": "Resource is not actively assigned to this project."}, status=status.HTTP_400_BAD_REQUEST)
    entry = serializer.save(project=project, created_by=request.user)
    return Response(TimesheetEntrySerializer(entry).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def timesheet_entry_detail(request, project_id, entry_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    try:
        entry = TimesheetEntry.objects.select_related(
            "resource", "approved_by",
        ).get(pk=entry_id, project=project)
    except TimesheetEntry.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(TimesheetEntrySerializer(entry).data)

    if not _can_edit_labour(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = TimesheetEntrySerializer(entry, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save(updated_by=request.user)
    return Response(serializer.data)
