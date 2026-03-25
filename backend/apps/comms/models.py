"""Communications models -- meetings, project chat, and org-wide chat."""
from django.conf import settings
from django.db import models
from apps.core.models import TimestampedModel, AuditMixin


class Meeting(TimestampedModel, AuditMixin):
    TYPE_CHOICES = [("progress", "Progress Meeting"), ("safety", "Safety Meeting"), ("design", "Design Review"), ("handover", "Handover"), ("site", "Site Meeting"), ("client", "Client Meeting"), ("other", "Other")]

    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="meetings")
    title = models.CharField(max_length=255)
    meeting_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="progress")
    meeting_date = models.DateField()
    location = models.CharField(max_length=255, blank=True, default="")
    attendees = models.TextField(blank=True, default="")
    summary = models.TextField(blank=True, default="")
    chaired_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="chaired_meetings")

    class Meta:
        db_table = "comms_meeting"
        ordering = ["-meeting_date"]

    def __str__(self): return f"{self.title} ({self.meeting_date})"


class MeetingAction(models.Model):
    STATUS_CHOICES = [("open", "Open"), ("in_progress", "In Progress"), ("completed", "Completed"), ("cancelled", "Cancelled")]

    id = models.AutoField(primary_key=True)
    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name="actions")
    description = models.CharField(max_length=255)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="meeting_actions")
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    notes = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "comms_meeting_action"
        ordering = ["created_at"]

    def __str__(self): return self.description[:50]


class ChatMessage(TimestampedModel):
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="chat_messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_messages")
    message = models.TextField()

    class Meta:
        db_table = "comms_chat_message"
        ordering = ["created_at"]

    def __str__(self): return f"{self.sender} at {self.created_at}"


class OrgChatMessage(TimestampedModel):
    organisation = models.ForeignKey("accounts.Organisation", on_delete=models.CASCADE, related_name="org_chat_messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="org_chat_messages")
    message = models.TextField()

    class Meta:
        db_table = "comms_org_chat_message"
        ordering = ["created_at"]

    def __str__(self): return f"{self.sender} at {self.created_at}"
