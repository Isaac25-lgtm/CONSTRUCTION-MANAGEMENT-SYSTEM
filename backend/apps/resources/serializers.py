"""Resources serializers."""
from rest_framework import serializers
from .models import Resource, ProjectResourceAssignment


# ---------------------------------------------------------------------------
# Resource
# ---------------------------------------------------------------------------

class ResourceSerializer(serializers.ModelSerializer):
    resource_type_display = serializers.CharField(source="get_resource_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Resource
        fields = [
            "id", "organisation", "code", "resource_type", "resource_type_display",
            "name", "role", "daily_rate",
            "status", "status_display",
            "phone", "notes",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "organisation", "resource_type_display", "status_display",
            "created_at", "updated_at",
        ]


class ResourceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resource
        fields = [
            "code", "resource_type", "name", "role", "daily_rate",
            "status", "phone", "notes",
        ]


# ---------------------------------------------------------------------------
# Project Resource Assignment
# ---------------------------------------------------------------------------

class ProjectResourceAssignmentSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    resource_name = serializers.CharField(source="resource.name", read_only=True, default=None)
    resource_code = serializers.CharField(source="resource.code", read_only=True, default=None)

    class Meta:
        model = ProjectResourceAssignment
        fields = [
            "id", "project", "resource", "resource_name", "resource_code",
            "assignment_role", "assigned_from", "assigned_to",
            "status", "status_display",
            "notes", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "status_display", "resource_name", "resource_code",
            "created_at", "updated_at",
        ]


class ProjectResourceAssignmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectResourceAssignment
        fields = [
            "resource", "assignment_role", "assigned_from", "assigned_to",
            "status", "notes",
        ]
