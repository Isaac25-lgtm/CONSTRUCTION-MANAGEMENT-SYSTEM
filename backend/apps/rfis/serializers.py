"""RFI serializers."""
from rest_framework import serializers
from .models import RFI


class RFISerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    raised_by_name = serializers.CharField(source="raised_by.get_full_name", read_only=True, default=None)
    assigned_to_name = serializers.CharField(source="assigned_to.get_full_name", read_only=True, default=None)

    class Meta:
        model = RFI
        fields = [
            "id", "project", "code", "subject", "question",
            "raised_by", "raised_by_name",
            "assigned_to", "assigned_to_name",
            "date_raised", "due_date",
            "response", "response_date",
            "status", "status_display",
            "priority", "priority_display",
            "is_overdue", "related_task",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "status_display", "priority_display", "is_overdue",
            "raised_by_name", "assigned_to_name",
            "created_at", "updated_at",
        ]


class RFICreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RFI
        fields = [
            "code", "subject", "question", "raised_by", "assigned_to",
            "date_raised", "due_date", "response", "response_date",
            "status", "priority", "related_task",
        ]
