"""Resources views -- org-scoped resources and project resource assignments."""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.projects.models import Project
from .models import Resource, ProjectResourceAssignment
from .serializers import (
    ResourceSerializer, ResourceCreateSerializer,
    ProjectResourceAssignmentSerializer, ProjectResourceAssignmentCreateSerializer,
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


def _can_edit_project(request, project):
    return request.user.has_project_perm(project, "project.edit")


# ---------------------------------------------------------------------------
# Resources (org-scoped)
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def resource_list(request):
    org = request.user.organisation

    if request.method == "GET":
        resources = Resource.objects.filter(organisation=org)
        return Response(ResourceSerializer(resources, many=True).data)

    # Only admin or management can create org-level resources
    if not request.user.has_system_perm("admin.full_access") and not request.user.has_system_perm("admin.manage_users"):
        return Response({"detail": "Only admin or management can create resources."}, status=status.HTTP_403_FORBIDDEN)

    serializer = ResourceCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    resource = serializer.save(organisation=org, created_by=request.user)
    return Response(ResourceSerializer(resource).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def resource_detail(request, resource_id):
    org = request.user.organisation
    try:
        resource = Resource.objects.get(pk=resource_id, organisation=org)
    except Resource.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(ResourceSerializer(resource).data)

    # Only admin or management can update org-level resources
    if not request.user.has_system_perm("admin.full_access") and not request.user.has_system_perm("admin.manage_users"):
        return Response({"detail": "Only admin or management can update resources."}, status=status.HTTP_403_FORBIDDEN)

    serializer = ResourceSerializer(resource, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save(updated_by=request.user)
    return Response(serializer.data)


# ---------------------------------------------------------------------------
# Project Resource Assignments (project-scoped)
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def assignment_list(request, project_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        assignments = ProjectResourceAssignment.objects.filter(
            project=project,
        ).select_related("resource")
        return Response(ProjectResourceAssignmentSerializer(assignments, many=True).data)

    if not _can_edit_project(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = ProjectResourceAssignmentCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    # Check for duplicate assignment
    resource_id = serializer.validated_data.get("resource_id") or request.data.get("resource")
    if ProjectResourceAssignment.objects.filter(project=project, resource_id=resource_id).exists():
        return Response({"detail": "Resource already assigned to this project."}, status=status.HTTP_400_BAD_REQUEST)
    assignment = serializer.save(project=project, created_by=request.user)
    return Response(
        ProjectResourceAssignmentSerializer(assignment).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def assignment_detail(request, project_id, assignment_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    try:
        assignment = ProjectResourceAssignment.objects.select_related("resource").get(
            pk=assignment_id, project=project,
        )
    except ProjectResourceAssignment.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(ProjectResourceAssignmentSerializer(assignment).data)

    if not _can_edit_project(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    if request.method == "DELETE":
        assignment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = ProjectResourceAssignmentSerializer(
        assignment, data=request.data, partial=True,
    )
    serializer.is_valid(raise_exception=True)
    serializer.save(updated_by=request.user)
    return Response(serializer.data)
