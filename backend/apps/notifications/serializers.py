"""Notifications serializers."""
from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    level_display = serializers.CharField(source="get_level_display", read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id", "user", "project", "notification_type",
            "title", "message",
            "level", "level_display",
            "is_read", "link",
            "created_at", "read_at",
        ]
        read_only_fields = [
            "id", "user", "project", "notification_type",
            "title", "message", "level", "level_display",
            "link", "created_at", "read_at",
        ]
