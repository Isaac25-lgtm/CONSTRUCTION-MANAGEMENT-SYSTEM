"""
Accounts models -- User, Organisation, SystemRole, and permissions.

Single-org deployment: all users belong to one Organisation.
System roles define org-wide capabilities (Admin, Management, etc.).
Project-level access is handled by ProjectMembership in the projects app.
"""
import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models

from apps.core.models import TimestampedModel


class Organisation(TimestampedModel):
    """
    Single organisation that owns all BuildPro data.
    """

    name = models.CharField(max_length=255)
    address = models.TextField(blank=True, default="")
    phone = models.CharField(max_length=50, blank=True, default="")
    email = models.EmailField(blank=True, default="")

    class Meta:
        db_table = "accounts_organisation"

    def __str__(self):
        return self.name


class SystemRole(TimestampedModel):
    """
    Organisation-wide role defining system-level capabilities.

    Default roles (created by seed):
      - Admin: full access to everything
      - Management: broad access, can create projects and manage users
      - Standard: normal staff, access determined by project membership
      - Viewer: read-only across all assigned projects
    """

    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default="")
    permissions = models.JSONField(
        default=list,
        help_text="List of permission codenames this role grants.",
    )
    is_default = models.BooleanField(
        default=False,
        help_text="If True, new users get this role automatically.",
    )

    class Meta:
        db_table = "accounts_system_role"
        ordering = ["name"]

    def __str__(self):
        return self.name

    def has_perm(self, perm: str) -> bool:
        """Check if this role grants a specific permission."""
        return perm in self.permissions or "admin.full_access" in self.permissions


# ---------------------------------------------------------------------------
# Permission codenames
# ---------------------------------------------------------------------------
# These are plain strings stored in SystemRole.permissions and
# ProjectMembership.permissions. No Django Permission model needed --
# we check them explicitly in DRF permission classes.

SYSTEM_PERMISSIONS = [
    # Organisation / admin
    "admin.full_access",
    "admin.manage_users",
    "admin.manage_roles",
    "admin.manage_org_settings",
    # Project lifecycle
    "projects.create",
    "projects.delete",
    "projects.view_all",
    # Reporting
    "reports.view_cross_project",
    "reports.export",
]

PROJECT_PERMISSIONS = [
    # Core project
    "project.view",
    "project.edit",
    "project.manage_members",
    # Schedule
    "schedule.view",
    "schedule.edit",
    # Cost & budget
    "budget.view",
    "budget.edit",
    "budget.approve",
    # Field operations
    "field_ops.view",
    "field_ops.edit",
    # Procurement
    "procurement.view",
    "procurement.edit",
    "procurement.approve",
    # Labour
    "labour.view",
    "labour.edit",
    # Documents
    "documents.view",
    "documents.upload",
    "documents.delete",
    # Risks, RFIs, Changes
    "risks.view",
    "risks.edit",
    "rfis.view",
    "rfis.edit",
    "changes.view",
    "changes.edit",
    "changes.approve",
    # Reports
    "reports.view",
    "reports.export",
    # AI
    "ai.use",
    "ai.history",
    # Communications
    "comms.view",
    "comms.edit",
    "comms.send",
]


# Default role definitions
DEFAULT_ROLES = {
    "Admin": {
        "description": "Full access to all features and settings.",
        "permissions": ["admin.full_access"],
    },
    "Management": {
        "description": "Can create projects, manage users, view all projects, export reports.",
        "permissions": [
            "projects.create",
            "projects.view_all",
            "admin.manage_users",
            "reports.view_cross_project",
            "reports.export",
        ],
    },
    "Standard": {
        "description": "Normal staff member. Access determined by project membership.",
        "permissions": [],
        "is_default": True,
    },
    "Viewer": {
        "description": "Read-only access to assigned projects.",
        "permissions": [],
    },
}

# Default project-role permission sets
DEFAULT_PROJECT_ROLE_PERMISSIONS = {
    "manager": [
        "project.view", "project.edit", "project.manage_members",
        "schedule.view", "schedule.edit",
        "budget.view", "budget.edit", "budget.approve",
        "field_ops.view", "field_ops.edit",
        "labour.view", "labour.edit",
        "procurement.view", "procurement.edit", "procurement.approve",
        "documents.view", "documents.upload", "documents.delete",
        "risks.view", "risks.edit",
        "rfis.view", "rfis.edit",
        "changes.view", "changes.edit", "changes.approve",
        "reports.view", "reports.export",
        "ai.use", "ai.history",
        "comms.view", "comms.edit", "comms.send",
    ],
    "engineer": [
        "project.view",
        "schedule.view", "schedule.edit",
        "budget.view",
        "field_ops.view", "field_ops.edit",
        "labour.view", "labour.edit",
        "procurement.view",
        "documents.view", "documents.upload",
        "risks.view", "risks.edit",
        "rfis.view", "rfis.edit",
        "changes.view",
        "reports.view", "reports.export",
        "ai.use",
        "comms.view", "comms.edit", "comms.send",
    ],
    "qs": [
        "project.view",
        "schedule.view",
        "budget.view", "budget.edit",
        "field_ops.view",
        "procurement.view", "procurement.edit",
        "documents.view", "documents.upload",
        "risks.view",
        "rfis.view",
        "changes.view", "changes.edit",
        "reports.view", "reports.export",
        "ai.use",
        "comms.view", "comms.edit", "comms.send",
    ],
    "supervisor": [
        "project.view",
        "schedule.view",
        "budget.view",
        "field_ops.view", "field_ops.edit",
        "procurement.view",
        "documents.view", "documents.upload",
        "risks.view",
        "rfis.view", "rfis.edit",
        "changes.view",
        "reports.view", "reports.export",
        "ai.use",
        "comms.view", "comms.edit", "comms.send",
    ],
    # Note: supervisor gets comms.edit for meeting management
    "viewer": [
        "project.view",
        "schedule.view",
        "budget.view",
        "field_ops.view",
        "procurement.view",
        "documents.view",
        "risks.view",
        "rfis.view",
        "changes.view",
        "reports.view", "reports.export",
        "ai.use",
        "comms.view",
    ],
}


class User(AbstractUser):
    """
    Custom user model for BuildPro.

    Uses UUID primary key. Linked to a single Organisation and a SystemRole.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone = models.CharField(max_length=50, blank=True, default="")
    job_title = models.CharField(max_length=100, blank=True, default="")
    organisation = models.ForeignKey(
        Organisation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
    )
    system_role = models.ForeignKey(
        SystemRole,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
    )

    class Meta:
        db_table = "accounts_user"
        ordering = ["username"]

    def __str__(self):
        return self.get_full_name() or self.username

    @property
    def is_admin(self) -> bool:
        return self.is_staff or (
            self.system_role is not None
            and self.system_role.has_perm("admin.full_access")
        )

    def has_system_perm(self, perm: str) -> bool:
        """Check if user has a system-level permission via their role."""
        if self.is_admin:
            return True
        if self.system_role is None:
            return False
        return self.system_role.has_perm(perm)

    def has_project_perm(self, project, perm: str) -> bool:
        """Check if user has a project-level permission via membership."""
        if self.is_admin:
            return True
        if self.has_system_perm("projects.view_all") and perm == "project.view":
            return True
        try:
            membership = self.project_memberships.get(project=project)
            return perm in membership.permissions
        except self.project_memberships.model.DoesNotExist:
            return False

    def get_accessible_project_ids(self):
        """Return project IDs this user can access."""
        if self.is_admin or self.has_system_perm("projects.view_all"):
            from apps.projects.models import Project
            return Project.objects.filter(
                organisation=self.organisation
            ).values_list("id", flat=True)
        return self.project_memberships.values_list("project_id", flat=True)
