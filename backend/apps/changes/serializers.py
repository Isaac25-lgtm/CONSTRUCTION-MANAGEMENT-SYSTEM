"""Change Order serializers."""
from rest_framework import serializers
from .models import ChangeOrder


class ChangeOrderSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    requested_by_name = serializers.CharField(source="requested_by.get_full_name", read_only=True, default=None)
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True, default=None)

    class Meta:
        model = ChangeOrder
        fields = [
            "id", "project", "code", "title", "description",
            "category", "category_display",
            "reason", "cost_impact", "time_impact_days",
            "status", "status_display",
            "requested_by", "requested_by_name",
            "approved_by", "approved_by_name",
            "requested_date",
            "related_rfi", "related_task",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "status_display", "category_display",
            "requested_by_name", "approved_by_name",
            "requested_date", "created_at", "updated_at",
        ]


class ChangeOrderCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChangeOrder
        fields = [
            "code", "title", "description", "category", "reason",
            "cost_impact", "time_impact_days", "status",
            "requested_by", "approved_by",
            "related_rfi", "related_task",
        ]
