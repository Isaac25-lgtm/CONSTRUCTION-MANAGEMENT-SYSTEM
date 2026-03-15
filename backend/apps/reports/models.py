"""Reports models -- generated report exports and download history."""
from pathlib import Path

from django.db import models

from apps.core.models import AuditMixin, TimestampedModel


def report_export_upload_path(instance, filename):
    """Persist generated exports under an org/scope path."""
    org_id = instance.organisation_id or "org"
    scope = instance.scope or "report"
    suffix = Path(filename).suffix or ".csv"
    return f"reports/{org_id}/{scope}/{instance.report_key}_{instance.id}{suffix}"


class ReportExport(TimestampedModel, AuditMixin):
    """A generated report file stored for later download/history."""

    SCOPE_CHOICES = [
        ("project", "Project"),
        ("cross_project", "Cross-Project"),
    ]
    FORMAT_CHOICES = [
        ("csv", "CSV"),
        ("xlsx", "Excel"),
        ("pdf", "PDF"),
        ("docx", "Word"),
    ]
    REPORT_KEY_CHOICES = [
        ("progress", "Project Progress"),
        ("financial", "Financial Summary"),
        ("schedule", "Schedule Summary"),
        ("procurement", "Procurement Summary"),
        ("safety", "Safety Report"),
        ("quality", "Quality Report"),
        ("labour", "Labour / Timesheets"),
        ("risk", "Risk Register"),
        ("rfi", "RFI Register"),
        ("changes", "Change Orders"),
        ("punch", "Punch List"),
        ("documents", "Document Register"),
        ("meetings", "Meetings & Actions"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]

    organisation = models.ForeignKey(
        "accounts.Organisation",
        on_delete=models.CASCADE,
        related_name="report_exports",
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="report_exports",
    )
    scope = models.CharField(max_length=20, choices=SCOPE_CHOICES, default="project")
    report_key = models.CharField(max_length=30, choices=REPORT_KEY_CHOICES)
    format = models.CharField(max_length=10, choices=FORMAT_CHOICES, default="csv")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="completed")
    filters = models.JSONField(default=dict, blank=True)
    row_count = models.PositiveIntegerField(default=0)
    file_name = models.CharField(max_length=255, blank=True, default="")
    file = models.FileField(upload_to=report_export_upload_path, blank=True)

    class Meta:
        db_table = "reports_export"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_report_key_display()} ({self.get_format_display()})"
