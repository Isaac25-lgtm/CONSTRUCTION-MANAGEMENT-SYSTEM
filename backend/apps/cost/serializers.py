"""Cost serializers."""
from rest_framework import serializers

from apps.core.serializers import ProjectScopedValidationMixin
from .models import BudgetLine, Expense


def _normalize_expense_links(attrs, instance=None):
    """Keep linked_task and budget_line aligned when older and newer cost flows mix."""
    budget_line = attrs.get("budget_line")
    linked_task = attrs.get("linked_task")

    if instance is not None:
        if "budget_line" not in attrs:
            budget_line = instance.budget_line
        if "linked_task" not in attrs:
            linked_task = instance.linked_task

    if budget_line and budget_line.linked_task:
        if linked_task and linked_task != budget_line.linked_task:
            raise serializers.ValidationError({
                "linked_task": "Linked task must match the selected budget line's task.",
            })
        attrs["linked_task"] = budget_line.linked_task

    return attrs


class BudgetLineSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
    actual_amount = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    variance = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    linked_task_code = serializers.CharField(source="linked_task.code", read_only=True, default=None)

    class Meta:
        model = BudgetLine
        fields = [
            "id", "project", "linked_task", "linked_task_code", "code", "name", "description",
            "category", "category_display", "budget_amount",
            "actual_amount", "variance",
            "status", "status_display", "sort_order",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "linked_task_code", "actual_amount", "variance", "category_display",
            "status_display", "created_at", "updated_at",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self._validate_same_project(attrs, "linked_task", label="linked task")
        return attrs


class BudgetLineCreateSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
    class Meta:
        model = BudgetLine
        fields = [
            "code", "name", "description", "category",
            "budget_amount", "linked_task", "status", "sort_order",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self._validate_same_project(attrs, "linked_task", label="linked task")
        return attrs


class ExpenseSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    budget_line_name = serializers.CharField(source="budget_line.name", read_only=True, default=None)
    linked_task_code = serializers.CharField(source="linked_task.code", read_only=True, default=None)

    class Meta:
        model = Expense
        fields = [
            "id", "project", "budget_line", "budget_line_name", "linked_task", "linked_task_code",
            "description", "amount", "expense_date", "vendor", "reference",
            "category", "category_display", "status", "status_display", "notes",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "linked_task_code", "category_display", "status_display", "budget_line_name",
            "created_at", "updated_at",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self._validate_same_project(attrs, "budget_line", label="budget line")
        self._validate_same_project(attrs, "linked_task", label="linked task")
        return _normalize_expense_links(attrs, self.instance)


class ExpenseCreateSerializer(ProjectScopedValidationMixin, serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = [
            "budget_line", "linked_task", "description", "amount",
            "expense_date", "vendor", "reference", "category", "status", "notes",
        ]

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self._validate_same_project(attrs, "budget_line", label="budget line")
        self._validate_same_project(attrs, "linked_task", label="linked task")
        return _normalize_expense_links(attrs)
