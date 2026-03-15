"""Field Operations models -- PunchItem, DailyLog, SafetyIncident, QualityCheck."""
from django.conf import settings
from django.db import models
from apps.core.models import BaseModel


class PunchItem(BaseModel):
    """A deficiency / snag item for project closeout."""

    STATUS_CHOICES = [
        ("pending", "Pending"), ("in_progress", "In Progress"), ("completed", "Completed"),
    ]
    PRIORITY_CHOICES = [
        ("low", "Low"), ("medium", "Medium"), ("high", "High"), ("critical", "Critical"),
    ]

    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="punch_items")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    location = models.CharField(max_length=255, blank=True, default="")
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="medium")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="punch_items")
    due_date = models.DateField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    related_task = models.ForeignKey("scheduling.ProjectTask", on_delete=models.SET_NULL, null=True, blank=True, related_name="punch_items")

    class Meta:
        db_table = "field_ops_punch_item"
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class DailyLog(BaseModel):
    """A daily site diary entry."""

    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="daily_logs")
    log_date = models.DateField()
    weather = models.CharField(max_length=100, blank=True, default="")
    workforce = models.TextField(blank=True, default="", help_text="Workforce count/summary")
    work_performed = models.TextField()
    delays = models.TextField(blank=True, default="")
    materials_notes = models.TextField(blank=True, default="")
    visitors = models.TextField(blank=True, default="")
    incidents = models.TextField(blank=True, default="")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="daily_logs")

    class Meta:
        db_table = "field_ops_daily_log"
        ordering = ["-log_date"]
        unique_together = [("project", "log_date", "author")]

    def __str__(self):
        return f"Log {self.log_date}"


class SafetyIncident(BaseModel):
    """A safety incident or near-miss report."""

    TYPE_CHOICES = [
        ("injury", "Injury"), ("near_miss", "Near Miss"), ("property_damage", "Property Damage"),
        ("environmental", "Environmental"), ("fire", "Fire"), ("other", "Other"),
    ]
    SEVERITY_CHOICES = [
        ("minor", "Minor"), ("moderate", "Moderate"), ("serious", "Serious"), ("critical", "Critical"),
    ]
    STATUS_CHOICES = [
        ("open", "Open"), ("investigating", "Investigating"), ("resolved", "Resolved"), ("closed", "Closed"),
    ]

    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="safety_incidents")
    incident_date = models.DateField()
    title = models.CharField(max_length=255)
    description = models.TextField()
    incident_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="other")
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default="minor")
    location = models.CharField(max_length=255, blank=True, default="")
    immediate_action = models.TextField(blank=True, default="")
    follow_up = models.TextField(blank=True, default="")
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="safety_assignments")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    reported_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="safety_reports")

    class Meta:
        db_table = "field_ops_safety_incident"
        ordering = ["-incident_date"]

    def __str__(self):
        return f"{self.title} ({self.incident_date})"


class QualityCheck(BaseModel):
    """A quality inspection or check record."""

    RESULT_CHOICES = [
        ("pass", "Pass"), ("fail", "Fail"), ("conditional", "Conditional"), ("pending", "Pending"),
    ]
    CATEGORY_CHOICES = [
        ("concrete", "Concrete Test"), ("steel", "Steel Inspection"), ("soil", "Soil Test"),
        ("survey", "Survey Check"), ("visual", "Visual Inspection"), ("dimensional", "Dimensional Check"),
        ("material", "Material Test"), ("other", "Other"),
    ]

    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="quality_checks")
    check_date = models.DateField()
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="other")
    result = models.CharField(max_length=15, choices=RESULT_CHOICES, default="pending")
    location = models.CharField(max_length=255, blank=True, default="")
    remarks = models.TextField(blank=True, default="")
    corrective_action = models.TextField(blank=True, default="")
    inspector = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="quality_inspections")
    related_task = models.ForeignKey("scheduling.ProjectTask", on_delete=models.SET_NULL, null=True, blank=True, related_name="quality_checks")

    class Meta:
        db_table = "field_ops_quality_check"
        ordering = ["-check_date"]

    def __str__(self):
        return f"{self.title} ({self.check_date})"
