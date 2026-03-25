"""Scheduling serializers."""
from datetime import timedelta

from rest_framework import serializers

from apps.core.serializers import ProjectScopedValidationMixin
from .models import (
    ProjectTask, TaskDependency, Milestone,
    ScheduleBaseline, BaselineTaskSnapshot,
)


class TaskSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
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
            "id", "total_float", "is_critical", "predecessor_codes", "status_display",
            "created_at", "updated_at",
        ]

    def get_predecessor_codes(self, task):
        return list(
            task.predecessor_links
            .select_related("predecessor")
            .values_list("predecessor__code", flat=True)
        )

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self._validate_same_project(attrs, "parent", label="parent task")
        self._validate_same_org_user(attrs, "assigned_to", label="assignee")

        duration = attrs.get(
            "duration_days",
            getattr(self.instance, "duration_days", 0),
        )
        early_start = attrs.get(
            "early_start",
            getattr(self.instance, "early_start", 0),
        )
        early_finish = attrs.get(
            "early_finish",
            getattr(self.instance, "early_finish", early_start + duration),
        )
        late_start = attrs.get(
            "late_start",
            getattr(self.instance, "late_start", 0),
        )
        late_finish = attrs.get(
            "late_finish",
            getattr(self.instance, "late_finish", late_start + duration),
        )

        numeric_fields = {
            "duration_days": duration,
            "early_start": early_start,
            "early_finish": early_finish,
            "late_start": late_start,
            "late_finish": late_finish,
        }
        errors = {}
        for field_name, value in numeric_fields.items():
            if value < 0:
                errors[field_name] = "Value cannot be negative."

        if early_finish < early_start:
            errors["early_finish"] = "Early finish cannot be before early start."
        if late_finish < late_start:
            errors["late_finish"] = "Late finish cannot be before late start."

        planned_start = attrs.get(
            "planned_start",
            getattr(self.instance, "planned_start", None),
        )
        planned_end = attrs.get(
            "planned_end",
            getattr(self.instance, "planned_end", None),
        )
        if planned_start and planned_end and planned_end < planned_start:
            errors["planned_end"] = "Planned end cannot be before planned start."

        if errors:
            raise serializers.ValidationError(errors)
        return attrs


class TaskCreateSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
    predecessors = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = ProjectTask
        fields = [
            "code", "name", "description", "phase", "parent",
            "duration_days", "planned_start", "planned_end",
            "progress", "status", "resource", "budget",
            "sort_order", "is_parent", "predecessors",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self._validate_same_project(attrs, "parent", label="parent task")
        self._validate_same_org_user(attrs, "assigned_to", label="assignee")

        predecessors_raw = attrs.get("predecessors", "")
        project = self._current_project(attrs)
        if project and predecessors_raw:
            predecessor_codes = []
            seen = set()
            for code in [part.strip() for part in predecessors_raw.split(",") if part.strip()]:
                if code not in seen:
                    predecessor_codes.append(code)
                    seen.add(code)

            existing_codes = set(
                ProjectTask.objects.filter(project=project, code__in=predecessor_codes)
                .values_list("code", flat=True)
            )
            missing_codes = [code for code in predecessor_codes if code not in existing_codes]
            if missing_codes:
                raise serializers.ValidationError(
                    {
                        "predecessors": (
                            "Unknown predecessor code(s): "
                            + ", ".join(missing_codes)
                            + "."
                        )
                    }
                )
        return attrs

    def create(self, validated_data):
        predecessors_raw = validated_data.pop("predecessors", "")
        task = super().create(validated_data)

        predecessor_codes = []
        seen = set()
        for code in [part.strip() for part in predecessors_raw.split(",") if part.strip()]:
            if code not in seen:
                predecessor_codes.append(code)
                seen.add(code)

        if predecessor_codes:
            predecessors = ProjectTask.objects.filter(
                project=task.project,
                code__in=predecessor_codes,
            )
            TaskDependency.objects.bulk_create(
                [
                    TaskDependency(
                        project=task.project,
                        predecessor=predecessor,
                        successor=task,
                    )
                    for predecessor in predecessors
                ]
            )

        return task


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


class MilestoneSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
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

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self._validate_same_project(attrs, "linked_task", label="linked task")
        linked_task = attrs.get("linked_task", getattr(self.instance, "linked_task", None))
        project = self._current_project(attrs)
        if "target_date" not in attrs and linked_task and project and project.start_date:
            if linked_task.duration_days == 0 and linked_task.early_start == 0 and linked_task.early_finish == 0:
                attrs["target_date"] = None
            else:
                attrs["target_date"] = project.start_date + timedelta(days=linked_task.early_finish)
        return attrs


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
