"""Projects views -- access-controlled project CRUD + membership + setup."""
from django.db.models import Count, Prefetch
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


class ProjectPagination(PageNumberPagination):
    """Simple page-number pagination for project lists."""
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200

from apps.core.permissions import IsOrgMember, HasSystemPermission, ProjectPermission
from apps.accounts.models import DEFAULT_PROJECT_ROLE_PERMISSIONS

from .models import Project, ProjectMembership
from .serializers import (
    ProjectListSerializer,
    ProjectDetailSerializer,
    ProjectCreateSerializer,
    MembershipSerializer,
)
from .setup import initialize_project


class ProjectViewSet(viewsets.ModelViewSet):
    """
    Project CRUD with access control and setup engine.

    list: shows only projects the user can access
    retrieve: returns full detail with setup config and user permissions
    create: requires projects.create system permission, runs setup engine
    update/partial_update: requires project.edit permission
    destroy: soft-archives (sets status=cancelled)
    """

    permission_classes = [IsAuthenticated, IsOrgMember]
    pagination_class = ProjectPagination
    filterset_fields = ["status", "project_type", "contract_type"]
    search_fields = ["name", "code", "location", "client_name"]
    ordering_fields = ["name", "code", "created_at", "status"]

    def get_serializer_class(self):
        if self.action == "create":
            return ProjectCreateSerializer
        if self.action == "retrieve":
            return ProjectDetailSerializer
        return ProjectListSerializer

    def get_queryset(self):
        user = self.request.user
        qs = (
            Project.objects.filter(organisation=user.organisation)
            .select_related("setup_config")
            .annotate(member_count_value=Count("memberships", distinct=True))
            .prefetch_related(
                Prefetch(
                    "memberships",
                    queryset=ProjectMembership.objects.filter(user=user),
                    to_attr="current_user_memberships",
                )
            )
        )
        if not (user.is_admin or user.has_system_perm("projects.view_all")):
            accessible_ids = user.get_accessible_project_ids()
            qs = qs.filter(id__in=accessible_ids)
        return qs.order_by("-created_at")

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), IsOrgMember(), HasSystemPermission("projects.create")()]
        if self.action in ("update", "partial_update"):
            return [IsAuthenticated(), IsOrgMember(), ProjectPermission("project.edit")()]
        if self.action == "destroy":
            return [IsAuthenticated(), IsOrgMember(), HasSystemPermission("projects.delete")()]
        return super().get_permissions()

    def perform_update(self, serializer):
        """
        Re-run setup engine if project_type or contract_type changed.

        If schedule tasks already exist, block the type/contract change
        to prevent data loss. The user must explicitly reinitialize the
        schedule via a separate action if they want to change type.
        """
        old_project = self.get_object()
        old_type = old_project.project_type
        old_contract = old_project.contract_type
        new_type = serializer.validated_data.get("project_type", old_type)
        new_contract = serializer.validated_data.get("contract_type", old_contract)

        if (new_type != old_type or new_contract != old_contract):
            from apps.scheduling.models import ProjectTask
            if ProjectTask.objects.filter(project=old_project).exists():
                from rest_framework.exceptions import ValidationError
                raise ValidationError({
                    "detail": "Cannot change project type or contract type after schedule tasks exist. "
                    "Delete existing tasks first or create a new project."
                })

        project = serializer.save(updated_by=self.request.user)
        if project.project_type != old_type or project.contract_type != old_contract:
            initialize_project(project)
            from apps.scheduling.engine import seed_tasks_from_setup
            seed_tasks_from_setup(project)

    def perform_create(self, serializer):
        project = serializer.save(
            organisation=self.request.user.organisation,
            created_by=self.request.user,
        )
        # Auto-add creator as project manager
        ProjectMembership.objects.create(
            project=project,
            user=self.request.user,
            role="manager",
            permissions=DEFAULT_PROJECT_ROLE_PERMISSIONS["manager"],
        )
        # Run setup engine + seed real schedule records
        initialize_project(project)
        from apps.scheduling.engine import seed_tasks_from_setup
        seed_tasks_from_setup(project)
        # Store for create response
        self._created_project = project

    def create(self, request, *args, **kwargs):
        """Override to return full project data (with code) after creation."""
        response = super().create(request, *args, **kwargs)
        if hasattr(self, '_created_project'):
            response.data = ProjectListSerializer(self._created_project).data
        return response

    def perform_destroy(self, instance):
        """Soft-archive: set status to cancelled instead of hard delete."""
        instance.status = "cancelled"
        instance.save(update_fields=["status"])

    # -- Membership sub-resource --

    @action(detail=True, methods=["get", "post"], url_path="members")
    def members(self, request, pk=None):
        """List or add project members."""
        project = self.get_object()

        if request.method == "GET":
            if not request.user.has_project_perm(project, "project.view"):
                return Response(status=status.HTTP_403_FORBIDDEN)
            memberships = project.memberships.select_related("user")
            return Response(MembershipSerializer(memberships, many=True).data)

        # POST -- add member
        if not request.user.has_project_perm(project, "project.manage_members"):
            return Response(
                {"detail": "Permission denied: project.manage_members required."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = MembershipSerializer(
            data={**request.data, "project": project.id},
            context={"request": request, "project": project},
        )
        serializer.is_valid(raise_exception=True)
        membership = serializer.save()
        # Notify the user about their project assignment
        from apps.notifications.services import notify_project_assignment
        notify_project_assignment(user=membership.user, project=project, role=membership.role)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=["patch", "delete"],
        url_path="members/(?P<membership_id>[^/.]+)",
        url_name="update-member",
    )
    def update_or_remove_member(self, request, pk=None, membership_id=None):
        """Update or remove a project member."""
        project = self.get_object()
        if not request.user.has_project_perm(project, "project.manage_members"):
            return Response(status=status.HTTP_403_FORBIDDEN)
        try:
            membership = project.memberships.get(pk=membership_id)
        except ProjectMembership.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if request.method == "DELETE":
            membership.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        # PATCH -- update role/permissions
        new_role = request.data.get("role")
        if new_role:
            valid_roles = dict(ProjectMembership.ROLE_CHOICES)
            if new_role not in valid_roles:
                return Response(
                    {"detail": f"Invalid role: {new_role}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            membership.role = new_role
            # Auto-update permissions from role defaults unless custom perms provided
            if "permissions" not in request.data:
                membership.permissions = DEFAULT_PROJECT_ROLE_PERMISSIONS.get(
                    new_role, DEFAULT_PROJECT_ROLE_PERMISSIONS["viewer"]
                )
        if "permissions" in request.data:
            membership.permissions = request.data["permissions"]
        membership.save()
        return Response(MembershipSerializer(membership).data)

    @action(detail=True, methods=["post"], url_path="archive")
    def archive(self, request, pk=None):
        """Archive a project (set status to cancelled)."""
        project = self.get_object()
        if not request.user.has_project_perm(project, "project.edit"):
            return Response(status=status.HTTP_403_FORBIDDEN)
        project.status = "cancelled"
        project.save(update_fields=["status"])
        return Response({"detail": "Project archived."})
