"""Field Operations serializers."""
from rest_framework import serializers

from apps.core.serializers import ProjectScopedValidationMixin
from .models import PunchItem, DailyLog, SafetyIncident, QualityCheck


# ---------------------------------------------------------------------------
# Punch Items
# ---------------------------------------------------------------------------

class PunchItemSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    assigned_to_name = serializers.CharField(source="assigned_to.get_full_name", read_only=True, default=None)

    class Meta:
        model = PunchItem
        fields = [
            "id", "project", "title", "description", "location",
            "priority", "priority_display",
            "status", "status_display",
            "assigned_to", "assigned_to_name",
            "due_date", "closed_at", "related_task",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "status_display", "priority_display", "assigned_to_name",
            "created_at", "updated_at",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self._validate_same_org_user(attrs, "assigned_to", label="assignee")
        self._validate_same_project(attrs, "related_task", label="related task")
        return attrs


class PunchItemCreateSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
    class Meta:
        model = PunchItem
        fields = [
            "title", "description", "location", "priority", "status",
            "assigned_to", "due_date", "closed_at", "related_task",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self._validate_same_org_user(attrs, "assigned_to", label="assignee")
        self._validate_same_project(attrs, "related_task", label="related task")
        return attrs


# ---------------------------------------------------------------------------
# Daily Logs
# ---------------------------------------------------------------------------

class DailyLogSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.get_full_name", read_only=True, default=None)

    class Meta:
        model = DailyLog
        fields = [
            "id", "project", "log_date", "weather", "workforce", "equipment",
            "work_performed", "delays", "materials_notes",
            "visitors", "incidents",
            "author", "author_name",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "author_name", "created_at", "updated_at",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self._validate_same_org_user(attrs, "author", label="author")
        return attrs


class DailyLogCreateSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
    class Meta:
        model = DailyLog
        fields = [
            "log_date", "weather", "workforce", "equipment", "work_performed",
            "delays", "materials_notes", "visitors", "incidents", "author",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self._validate_same_org_user(attrs, "author", label="author")
        return attrs


# ---------------------------------------------------------------------------
# Safety Incidents
# ---------------------------------------------------------------------------

class SafetyIncidentSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
    incident_type_display = serializers.CharField(source="get_incident_type_display", read_only=True)
    severity_display = serializers.CharField(source="get_severity_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    assigned_to_name = serializers.CharField(source="assigned_to.get_full_name", read_only=True, default=None)
    reported_by_name = serializers.CharField(source="reported_by.get_full_name", read_only=True, default=None)

    class Meta:
        model = SafetyIncident
        fields = [
            "id", "project", "incident_date", "title", "description",
            "incident_type", "incident_type_display",
            "severity", "severity_display",
            "location", "immediate_action", "follow_up",
            "assigned_to", "assigned_to_name",
            "status", "status_display",
            "reported_by", "reported_by_name",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "incident_type_display", "severity_display", "status_display",
            "assigned_to_name", "reported_by_name",
            "created_at", "updated_at",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self._validate_same_org_user(attrs, "assigned_to", label="assignee")
        self._validate_same_org_user(attrs, "reported_by", label="reporter")
        return attrs


class SafetyIncidentCreateSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
    class Meta:
        model = SafetyIncident
        fields = [
            "incident_date", "title", "description", "incident_type",
            "severity", "location", "immediate_action", "follow_up",
            "assigned_to", "status", "reported_by",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self._validate_same_org_user(attrs, "assigned_to", label="assignee")
        self._validate_same_org_user(attrs, "reported_by", label="reporter")
        return attrs


# ---------------------------------------------------------------------------
# Quality Checks
# ---------------------------------------------------------------------------

class QualityCheckSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
    result_display = serializers.CharField(source="get_result_display", read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    inspector_name = serializers.CharField(source="inspector.get_full_name", read_only=True, default=None)

    class Meta:
        model = QualityCheck
        fields = [
            "id", "project", "check_date", "title", "description",
            "category", "category_display",
            "result", "result_display",
            "location", "remarks", "corrective_action",
            "inspector", "inspector_name",
            "related_task",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "result_display", "category_display", "inspector_name",
            "created_at", "updated_at",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self._validate_same_org_user(attrs, "inspector", label="inspector")
        self._validate_same_project(attrs, "related_task", label="related task")
        return attrs


class QualityCheckCreateSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
    class Meta:
        model = QualityCheck
        fields = [
            "check_date", "title", "description", "category", "result",
            "location", "remarks", "corrective_action",
            "inspector", "related_task",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self._validate_same_org_user(attrs, "inspector", label="inspector")
        self._validate_same_project(attrs, "related_task", label="related task")
        return attrs
