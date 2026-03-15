"""AI models -- async job tracking and AI request audit log."""
import uuid

from django.db import models
from django.utils import timezone


class AsyncJob(models.Model):
    """Tracks long-running async tasks (exports, AI, processing)."""

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("running", "Running"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]

    JOB_TYPE_CHOICES = [
        ("export", "Report Export"),
        ("ai_narrative", "AI Narrative"),
        ("ai_report_draft", "AI Report Draft"),
        ("ai_copilot", "AI Copilot Query"),
        ("ai_other", "AI Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job_type = models.CharField(max_length=30, choices=JOB_TYPE_CHOICES)
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE,
        null=True, blank=True, related_name="async_jobs",
    )
    initiated_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL,
        null=True, related_name="async_jobs",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True, default="")
    output_reference = models.TextField(blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ai_async_job"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.job_type} - {self.status}"

    def mark_running(self):
        self.status = "running"
        self.started_at = timezone.now()
        self.save(update_fields=["status", "started_at"])

    def mark_completed(self, output=""):
        self.status = "completed"
        self.completed_at = timezone.now()
        self.output_reference = output
        self.save(update_fields=["status", "completed_at", "output_reference"])

    def mark_failed(self, error=""):
        self.status = "failed"
        self.failed_at = timezone.now()
        self.error_message = error
        self.save(update_fields=["status", "failed_at", "error_message"])


class AIRequestLog(models.Model):
    """Audit log for AI interactions -- who asked what, when, and what came back."""

    FEATURE_CHOICES = [
        ("narrative", "Cost/Schedule Narrative"),
        ("report_draft", "Report Draft"),
        ("copilot", "Project Copilot"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL,
        null=True, related_name="ai_requests",
    )
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE,
        null=True, blank=True, related_name="ai_requests",
    )
    async_job = models.ForeignKey(
        AsyncJob, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="ai_logs",
    )
    feature = models.CharField(max_length=30, choices=FEATURE_CHOICES)
    provider = models.CharField(max_length=30, default="gemini")
    model_id = models.CharField(max_length=60, default="")
    status = models.CharField(max_length=20, default="pending")

    request_summary = models.TextField(blank=True, default="")
    context_token_estimate = models.IntegerField(default=0)

    response_summary = models.TextField(blank=True, default="")
    response_length = models.IntegerField(default=0)
    duration_ms = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ai_request_log"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.feature} by {self.user} - {self.status}"
