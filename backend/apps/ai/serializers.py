"""AI serializers."""
from rest_framework import serializers

from .models import AIRequestLog, AsyncJob


class AsyncJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = AsyncJob
        fields = [
            "id", "job_type", "project", "status",
            "started_at", "completed_at", "failed_at",
            "error_message", "output_reference", "metadata",
            "created_at",
        ]


class AIRequestLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = AIRequestLog
        fields = [
            "id", "user", "user_name", "project", "feature",
            "provider", "model_id", "status",
            "request_summary", "response_summary",
            "response_length", "duration_ms", "created_at",
        ]

    def get_user_name(self, obj):
        if not obj.user:
            return ""
        return obj.user.get_full_name() or obj.user.username
