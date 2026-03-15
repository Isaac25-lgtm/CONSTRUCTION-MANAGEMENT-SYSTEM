"""Labour serializers."""
from rest_framework import serializers
from .models import TimesheetEntry


class TimesheetEntrySerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    resource_name = serializers.CharField(source="resource.name", read_only=True, default=None)
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True, default=None)
    total_hours = serializers.SerializerMethodField()

    class Meta:
        model = TimesheetEntry
        fields = [
            "id", "project", "resource", "resource_name",
            "task", "work_date", "hours", "overtime_hours", "total_hours",
            "description",
            "status", "status_display",
            "approved_by", "approved_by_name",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "status_display", "resource_name", "approved_by_name",
            "total_hours",
            "created_at", "updated_at",
        ]

    def get_total_hours(self, obj):
        return obj.hours + obj.overtime_hours


class TimesheetEntryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimesheetEntry
        fields = [
            "resource", "task", "work_date", "hours", "overtime_hours",
            "description", "status", "approved_by",
        ]
