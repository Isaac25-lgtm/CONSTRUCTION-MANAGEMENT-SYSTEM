"""Projects serializers -- project CRUD, setup config, and membership."""
from rest_framework import serializers

from apps.core.serializers import ProjectScopedValidationMixin
from .models import Project, ProjectMembership
from .setup import ProjectSetupConfig
from apps.accounts.models import DEFAULT_PROJECT_ROLE_PERMISSIONS


class ProjectListSerializer(serializers.ModelSerializer):
    """Serializer for project list views. Includes per-project permission flags."""

    member_count = serializers.SerializerMethodField()
    project_type_display = serializers.CharField(
        source="get_project_type_display", read_only=True
    )
    contract_type_display = serializers.CharField(
        source="get_contract_type_display", read_only=True
    )
    status_display = serializers.CharField(
        source="get_status_display", read_only=True
    )
    can_edit = serializers.SerializerMethodField()
    can_archive = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id",
            "code",
            "name",
            "description",
            "location",
            "project_type",
            "project_type_display",
            "contract_type",
            "contract_type_display",
            "status",
            "status_display",
            "start_date",
            "end_date",
            "budget",
            "client_name",
            "client_org",
            "consultant",
            "contractor",
            "member_count",
            "setup_complete",
            "can_edit",
            "can_archive",
            "created_at",
        ]
        read_only_fields = ["id", "code", "created_at", "member_count", "setup_complete",
                            "project_type_display", "contract_type_display", "status_display",
                            "can_edit", "can_archive"]

    def get_member_count(self, project):
        return project.memberships.count()

    def _get_user(self):
        request = self.context.get("request")
        return request.user if request else None

    def get_can_edit(self, project):
        user = self._get_user()
        if not user:
            return False
        return user.has_project_perm(project, "project.edit")

    def get_can_archive(self, project):
        user = self._get_user()
        if not user:
            return False
        # Archive requires edit permission and project is not already cancelled
        return (
            project.status != "cancelled"
            and user.has_project_perm(project, "project.edit")
        )


class SetupConfigSerializer(serializers.ModelSerializer):
    """Read-only serializer for project setup configuration."""

    class Meta:
        model = ProjectSetupConfig
        fields = [
            "phase_templates",
            "milestone_templates",
            "has_design_phase",
            "workspace_modules",
        ]
        read_only_fields = fields


class ProjectDetailSerializer(ProjectListSerializer):
    """Extended serializer for single project view."""

    client_phone = serializers.CharField(required=False, allow_blank=True)
    client_email = serializers.EmailField(required=False, allow_blank=True)
    user_role = serializers.SerializerMethodField()
    user_permissions = serializers.SerializerMethodField()
    setup_config = serializers.SerializerMethodField()

    class Meta(ProjectListSerializer.Meta):
        fields = ProjectListSerializer.Meta.fields + [
            "client_phone",
            "client_email",
            "user_role",
            "user_permissions",
            "setup_config",
        ]
        read_only_fields = ProjectListSerializer.Meta.read_only_fields + [
            "user_role",
            "user_permissions",
            "setup_config",
        ]

    def get_user_role(self, project):
        request = self.context.get("request")
        if not request:
            return None
        user = request.user
        if user.is_admin:
            return "admin"
        try:
            return project.memberships.get(user=user).role
        except ProjectMembership.DoesNotExist:
            return None

    def get_user_permissions(self, project):
        request = self.context.get("request")
        if not request:
            return []
        user = request.user
        if user.is_admin:
            return ["admin.full_access"]
        try:
            return project.memberships.get(user=user).permissions
        except ProjectMembership.DoesNotExist:
            return []

    def get_setup_config(self, project):
        try:
            return SetupConfigSerializer(project.setup_config).data
        except ProjectSetupConfig.DoesNotExist:
            return None


class ProjectCreateSerializer(serializers.ModelSerializer):
    """Serializer for project creation -- includes all setup fields."""

    class Meta:
        model = Project
        fields = [
            "name",
            "description",
            "location",
            "project_type",
            "contract_type",
            "start_date",
            "end_date",
            "budget",
            "client_name",
            "client_phone",
            "client_email",
            "client_org",
            "consultant",
            "contractor",
        ]


class MembershipSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
    """Serializer for project membership."""

    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    job_title = serializers.CharField(source="user.job_title", read_only=True)
    role_display = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = ProjectMembership
        fields = [
            "id",
            "project",
            "user",
            "username",
            "user_name",
            "user_email",
            "job_title",
            "role",
            "role_display",
            "permissions",
            "joined_at",
        ]
        read_only_fields = ["id", "joined_at", "user_name", "user_email", "username",
                            "job_title", "role_display"]

    def validate_role(self, value):
        valid_roles = dict(ProjectMembership.ROLE_CHOICES)
        if value not in valid_roles:
            raise serializers.ValidationError(f"Invalid role: {value}")
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self._validate_same_org_user(attrs, "user", label="project member")
        return attrs

    def create(self, validated_data):
        if not validated_data.get("permissions"):
            role = validated_data.get("role", "viewer")
            validated_data["permissions"] = DEFAULT_PROJECT_ROLE_PERMISSIONS.get(
                role, DEFAULT_PROJECT_ROLE_PERMISSIONS["viewer"]
            )
        return super().create(validated_data)
