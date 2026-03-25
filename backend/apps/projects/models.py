"""
Projects models -- Project, ProjectMembership, project setup templates.

Project is a construction project owned by an Organisation.
ProjectMembership links users to projects with a role and permission set.
"""
from django.conf import settings
from django.db import models

from apps.core.models import BaseModel


class Project(BaseModel):
    """A construction project with auto-generated project code."""

    PROJECT_TYPE_CHOICES = [
        ("residential", "Residential House Construction"),
        ("commercial", "Commercial Building"),
        ("road", "Road Construction"),
        ("bridge", "Bridge Construction"),
        ("water_treatment", "Water Treatment Plant"),
        ("dam", "Dam Construction"),
        ("school", "School Building"),
        ("hospital", "Hospital Construction"),
        ("custom", "Custom Project"),
    ]

    # Short prefix for project code generation
    TYPE_PREFIX = {
        "residential": "RES",
        "commercial": "COM",
        "road": "RD",
        "bridge": "BR",
        "water_treatment": "WT",
        "dam": "DAM",
        "school": "SCH",
        "hospital": "HOS",
        "custom": "GEN",
    }

    CONTRACT_TYPE_CHOICES = [
        ("lump_sum", "Lump Sum Contract"),
        ("admeasure", "Admeasure / Re-measurement Contract"),
        ("cost_plus", "Cost Plus Contract"),
        ("design_build", "Design & Build Contract"),
        ("management", "Management Contract"),
        ("turnkey", "Turnkey Contract"),
        ("bot", "BOT (Build-Operate-Transfer)"),
        ("other", "Other"),
    ]

    STATUS_CHOICES = [
        ("planning", "Planning"),
        ("active", "Active"),
        ("on_hold", "On Hold"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]

    # Identity
    code = models.CharField(
        max_length=20, unique=True, db_index=True,
        help_text="Auto-generated human-readable project code, e.g. BP-RES-001",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")

    # Classification
    project_type = models.CharField(max_length=30, choices=PROJECT_TYPE_CHOICES)
    contract_type = models.CharField(max_length=30, choices=CONTRACT_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="planning")

    # Location & dates
    location = models.CharField(max_length=255, blank=True, default="")
    project_manager_name = models.CharField(max_length=255, blank=True, default="")
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    # Financial
    budget = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    # Stakeholders
    client_name = models.CharField(max_length=255, blank=True, default="")
    client_phone = models.CharField(max_length=50, blank=True, default="")
    client_email = models.EmailField(blank=True, default="")
    client_org = models.CharField(max_length=255, blank=True, default="")
    consultant = models.CharField(
        max_length=255, blank=True, default="",
        help_text="Lead consultant / supervising firm",
    )
    contractor = models.CharField(
        max_length=255, blank=True, default="",
        help_text="Main contractor / company name",
    )

    # Setup state -- tracks what the setup engine has initialized
    setup_complete = models.BooleanField(default=False)

    organisation = models.ForeignKey(
        "accounts.Organisation",
        on_delete=models.CASCADE,
        related_name="projects",
    )

    class Meta(BaseModel.Meta):
        db_table = "projects_project"

    def __str__(self):
        return f"{self.code} - {self.name}"

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self._generate_code()
        super().save(*args, **kwargs)

    def _generate_code(self):
        """Generate project code: BP-{TYPE_PREFIX}-{SEQ:03d}."""
        prefix = self.TYPE_PREFIX.get(self.project_type, "GEN")
        last = (
            Project.all_objects
            .filter(code__startswith=f"BP-{prefix}-")
            .order_by("-code")
            .values_list("code", flat=True)
            .first()
        )
        if last:
            try:
                seq = int(last.split("-")[-1]) + 1
            except (ValueError, IndexError):
                seq = 1
        else:
            seq = 1
        return f"BP-{prefix}-{seq:03d}"


class ProjectMembership(models.Model):
    """
    Links a user to a project with a role and explicit permissions.
    """

    ROLE_CHOICES = [
        ("manager", "Project Manager"),
        ("engineer", "Engineer"),
        ("qs", "Quantity Surveyor"),
        ("supervisor", "Site Supervisor"),
        ("viewer", "Viewer"),
    ]

    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="memberships"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="project_memberships",
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="viewer")
    permissions = models.JSONField(
        default=list,
        help_text="List of project-level permission codenames.",
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "projects_membership"
        unique_together = [("project", "user")]

    def __str__(self):
        return f"{self.user} - {self.project} ({self.role})"

    def has_perm(self, perm: str) -> bool:
        return perm in self.permissions
