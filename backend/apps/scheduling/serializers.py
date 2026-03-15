"""Scheduling serializers."""
from rest_framework import serializers

from .models import (
    ProjectTask, TaskDependency, Milestone,
    ScheduleBaseline, BaselineTaskSnapshot,
)


class TaskSerializer(serializers.ModelSerializer):
    predecessor_codes = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = ProjectTask
        fields = [
            "id", "project", "parent", "code", "name", "description", "phase",
            "duration_days", "planned_start", "planned_end",
            "early_start", "early_finish", "late_start", "late_finish",
            "total_float", "is_critical",
            "progress", "status", "status_display",
            "resource", "assigned_to", "budget",
            "sort_order", "is_parent",
            "predecessor_codes",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "early_start", "early_finish", "late_start", "late_finish",
            "total_float", "is_critical", "predecessor_codes", "status_display",
            "created_at", "updated_at",
        ]

    def get_predecessor_codes(self, task):
        return list(
            task.predecessor_links
            .select_related("predecessor")
            .values_list("predecessor__code", flat=True)
        )


class TaskCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectTask
        fields = [
            "code", "name", "description", "phase", "parent",
            "duration_days", "planned_start", "planned_end",
            "progress", "status", "resource", "budget",
            "sort_order", "is_parent",
        ]


class DependencySerializer(serializers.ModelSerializer):
    predecessor_code = serializers.CharField(source="predecessor.code", read_only=True)
    successor_code = serializers.CharField(source="successor.code", read_only=True)

    class Meta:
        model = TaskDependency
        fields = [
            "id", "project", "predecessor", "successor",
            "predecessor_code", "successor_code",
            "dependency_type", "lag_days", "created_at",
        ]
        read_only_fields = ["id", "predecessor_code", "successor_code", "created_at"]


class MilestoneSerializer(serializers.ModelSerializer):
    linked_task_code = serializers.CharField(
        source="linked_task.code", read_only=True, default=None
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Milestone
        fields = [
            "id", "project", "linked_task", "linked_task_code",
            "code", "name", "description",
            "target_date", "actual_date",
            "status", "status_display", "sort_order",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "linked_task_code", "status_display", "created_at", "updated_at"]


class BaselineSerializer(serializers.ModelSerializer):
    snapshot_count = serializers.SerializerMethodField()

    class Meta:
        model = ScheduleBaseline
        fields = [
            "id", "project", "name", "version", "is_active",
            "notes", "snapshot_count", "created_at",
        ]
        read_only_fields = ["id", "version", "snapshot_count", "created_at"]

    def get_snapshot_count(self, baseline):
        return baseline.snapshots.count()
