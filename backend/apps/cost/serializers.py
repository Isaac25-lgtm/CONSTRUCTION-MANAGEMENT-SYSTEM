"""Cost serializers."""
from rest_framework import serializers
from .models import BudgetLine, Expense


class BudgetLineSerializer(serializers.ModelSerializer):
    actual_amount = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    variance = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = BudgetLine
        fields = [
            "id", "project", "linked_task", "code", "name", "description",
            "category", "category_display", "budget_amount",
            "actual_amount", "variance",
            "status", "status_display", "sort_order",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "actual_amount", "variance", "category_display",
            "status_display", "created_at", "updated_at",
        ]


class BudgetLineCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetLine
        fields = [
            "code", "name", "description", "category",
            "budget_amount", "linked_task", "status", "sort_order",
        ]


class ExpenseSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    budget_line_name = serializers.CharField(source="budget_line.name", read_only=True, default=None)

    class Meta:
        model = Expense
        fields = [
            "id", "project", "budget_line", "budget_line_name", "linked_task",
            "description", "amount", "expense_date", "vendor", "reference",
            "category", "category_display", "status", "status_display", "notes",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "category_display", "status_display", "budget_line_name",
            "created_at", "updated_at",
        ]


class ExpenseCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = [
            "budget_line", "linked_task", "description", "amount",
            "expense_date", "vendor", "reference", "category", "status", "notes",
        ]
