"""Labour/Timesheets models -- project timesheet entries."""
from django.conf import settings
from django.db import models
from apps.core.models import TimestampedModel, AuditMixin


class TimesheetEntry(TimestampedModel, AuditMixin):
    STATUS_CHOICES = [("draft", "Draft"), ("submitted", "Submitted"), ("approved", "Approved"), ("rejected", "Rejected")]

    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="timesheet_entries")
    resource = models.ForeignKey("resources.Resource", on_delete=models.CASCADE, related_name="timesheet_entries")
    task = models.ForeignKey("scheduling.ProjectTask", on_delete=models.SET_NULL, null=True, blank=True, related_name="timesheet_entries")
    work_date = models.DateField()
    hours = models.DecimalField(max_digits=5, decimal_places=2)
    overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    description = models.CharField(max_length=255, blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_timesheets")

    class Meta:
        db_table = "labour_timesheet"
        ordering = ["-work_date"]

    def __str__(self): return f"{self.resource.name} - {self.work_date} ({self.hours}h)"
