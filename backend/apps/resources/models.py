"""Resources models -- org-scoped resources with project assignments."""
from django.conf import settings
from django.db import models
from apps.core.models import TimestampedModel, AuditMixin


class Resource(TimestampedModel, AuditMixin):
    TYPE_CHOICES = [("personnel", "Personnel"), ("equipment", "Equipment"), ("vehicle", "Vehicle"), ("other", "Other")]
    STATUS_CHOICES = [("available", "Available"), ("assigned", "Assigned"), ("unavailable", "Unavailable"), ("maintenance", "Maintenance")]

    organisation = models.ForeignKey("accounts.Organisation", on_delete=models.CASCADE, related_name="resources")
    code = models.CharField(max_length=20)
    resource_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="personnel")
    name = models.CharField(max_length=255)
    role = models.CharField(max_length=100, blank=True, default="")
    daily_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="available")
    phone = models.CharField(max_length=50, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "resources_resource"
        ordering = ["name"]
        unique_together = [("organisation", "code")]

    def __str__(self): return f"{self.code} - {self.name}"


class ProjectResourceAssignment(TimestampedModel, AuditMixin):
    STATUS_CHOICES = [("active", "Active"), ("released", "Released"), ("planned", "Planned")]

    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="resource_assignments")
    resource = models.ForeignKey(Resource, on_delete=models.CASCADE, related_name="assignments")
    assignment_role = models.CharField(max_length=100, blank=True, default="")
    assigned_from = models.DateField(null=True, blank=True)
    assigned_to = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "resources_assignment"
        ordering = ["-created_at"]
        unique_together = [("project", "resource")]

    def __str__(self): return f"{self.resource.name} -> {self.project.name}"
