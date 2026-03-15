"""Notifications model."""
import uuid
from django.conf import settings
from django.db import models


class Notification(models.Model):
    LEVEL_CHOICES = [("info", "Info"), ("warning", "Warning"), ("danger", "Danger"), ("success", "Success")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, null=True, blank=True, related_name="notifications")
    notification_type = models.CharField(max_length=50, default="general")
    title = models.CharField(max_length=255)
    message = models.TextField(blank=True, default="")
    level = models.CharField(max_length=10, choices=LEVEL_CHOICES, default="info")
    is_read = models.BooleanField(default=False)
    link = models.CharField(max_length=500, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "notifications_notification"
        ordering = ["-created_at"]

    def __str__(self): return f"{self.title} -> {self.user}"
