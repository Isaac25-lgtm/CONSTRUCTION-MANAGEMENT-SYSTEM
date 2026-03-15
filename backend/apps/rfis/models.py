"""RFI (Request for Information) model."""
from django.conf import settings
from django.db import models
from django.utils import timezone
from apps.core.models import BaseModel


class RFI(BaseModel):
    """A request for information within a project."""

    STATUS_CHOICES = [
        ("open", "Open"), ("responded", "Responded"), ("closed", "Closed"),
    ]
    PRIORITY_CHOICES = [
        ("low", "Low"), ("medium", "Medium"), ("high", "High"), ("urgent", "Urgent"),
    ]

    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="rfis")
    code = models.CharField(max_length=20)
    subject = models.CharField(max_length=255)
    question = models.TextField()
    raised_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="rfis_raised")
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="rfis_assigned")
    date_raised = models.DateField(default=timezone.now)
    due_date = models.DateField(null=True, blank=True)
    response = models.TextField(blank=True, default="")
    response_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="medium")
    related_task = models.ForeignKey("scheduling.ProjectTask", on_delete=models.SET_NULL, null=True, blank=True, related_name="rfis")

    class Meta:
        db_table = "rfis_rfi"
        ordering = ["-date_raised"]
        unique_together = [("project", "code")]

    def __str__(self):
        return f"{self.code} - {self.subject}"

    @property
    def is_overdue(self):
        if self.status == "open" and self.due_date:
            return timezone.now().date() > self.due_date
        return False
