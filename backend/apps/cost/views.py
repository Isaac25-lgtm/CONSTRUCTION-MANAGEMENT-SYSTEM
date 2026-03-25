"""Cost views -- budget lines, expenses, cost summary, EVM, project overview."""
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.projects.models import Project
from apps.scheduling.models import ProjectTask
from .models import BudgetLine, Expense
from .serializers import (
    BudgetLineSerializer, BudgetLineCreateSerializer,
    ExpenseSerializer, ExpenseCreateSerializer,
)
from .services import build_task_cost_table, get_cost_summary, get_evm_metrics, get_project_overview


def _get_project_or_404(request, project_id):
    try:
        project = Project.objects.get(pk=project_id)
    except Project.DoesNotExist:
        return None
    if project.organisation_id != request.user.organisation_id:
        return None
    if not request.user.has_project_perm(project, "project.view"):
        return None
    return project


def _can_edit_budget(request, project):
    return request.user.has_project_perm(project, "budget.edit")


# ---------------------------------------------------------------------------
# Budget Lines
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def budget_line_list(request, project_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        lines = BudgetLine.objects.filter(project=project)
        return Response(BudgetLineSerializer(lines, many=True).data)

    if not _can_edit_budget(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = BudgetLineCreateSerializer(
        data=request.data,
        context={"request": request, "project": project},
    )
    serializer.is_valid(raise_exception=True)
    bl = serializer.save(project=project, created_by=request.user)
    return Response(BudgetLineSerializer(bl).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def budget_line_detail(request, project_id, line_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    try:
        bl = BudgetLine.objects.get(pk=line_id, project=project)
    except BudgetLine.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(BudgetLineSerializer(bl).data)

    if not _can_edit_budget(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    if request.method == "DELETE":
        bl.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = BudgetLineSerializer(
        bl,
        data=request.data,
        partial=True,
        context={"request": request, "project": project},
    )
    serializer.is_valid(raise_exception=True)
    serializer.save(updated_by=request.user)
    return Response(serializer.data)


# ---------------------------------------------------------------------------
# Expenses
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def expense_list(request, project_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        expenses = Expense.objects.filter(project=project).select_related("budget_line")
        return Response(ExpenseSerializer(expenses, many=True).data)

    if not _can_edit_budget(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    serializer = ExpenseCreateSerializer(
        data=request.data,
        context={"request": request, "project": project},
    )
    serializer.is_valid(raise_exception=True)
    exp = serializer.save(project=project, created_by=request.user)
    return Response(ExpenseSerializer(exp).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def expense_detail(request, project_id, expense_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    try:
        exp = Expense.objects.get(pk=expense_id, project=project)
    except Expense.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(ExpenseSerializer(exp).data)

    if not _can_edit_budget(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    if request.method == "DELETE":
        exp.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = ExpenseSerializer(
        exp,
        data=request.data,
        partial=True,
        context={"request": request, "project": project},
    )
    serializer.is_valid(raise_exception=True)
    serializer.save(updated_by=request.user)
    return Response(serializer.data)


# ---------------------------------------------------------------------------
# Cost Summary + EVM + Project Overview
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def cost_summary(request, project_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)
    return Response(get_cost_summary(project))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def evm_summary(request, project_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)
    return Response(get_evm_metrics(project))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def project_overview(request, project_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)
    return Response(get_project_overview(project))


# ---------------------------------------------------------------------------
# Task-centric cost table (prototype renderBudget parity)
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def task_cost_table(request, project_id):
    """
    Return task-centric cost data for the prototype-style Cost & Budget table.

    Each row is a scheduled task with its budget, actual expense total, variance,
    expense count, predecessor codes, and computed calendar dates.
    """
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    return Response(build_task_cost_table(project) or {
        "rows": [],
        "totals": {"budget": 0, "actual": 0, "variance": 0},
        "project_budget": float(project.budget),
    })


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def task_expenses(request, project_id, task_id):
    """List or create expenses linked to a specific task."""
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    try:
        task = ProjectTask.objects.get(pk=task_id, project=project)
    except ProjectTask.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        expenses = Expense.objects.filter(project=project).filter(
            Q(linked_task=task) |
            Q(linked_task__isnull=True, budget_line__linked_task=task)
        ).distinct()
        return Response(ExpenseSerializer(expenses, many=True).data)

    if not _can_edit_budget(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    data = request.data.copy()
    data["linked_task"] = str(task.id)
    serializer = ExpenseCreateSerializer(
        data=data,
        context={"request": request, "project": project},
    )
    serializer.is_valid(raise_exception=True)
    exp = serializer.save(project=project, created_by=request.user)
    return Response(ExpenseSerializer(exp).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def clear_budgets(request, project_id):
    """Reset all task budgets to zero and delete all expenses. Prototype parity."""
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if not _can_edit_budget(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    tasks = ProjectTask.objects.filter(project=project)
    task_ids = list(tasks.values_list("id", flat=True))
    task_codes = list(tasks.values_list("code", flat=True))

    tasks.update(budget=0)
    BudgetLine.objects.filter(project=project).filter(
        Q(linked_task_id__in=task_ids) |
        Q(linked_task__isnull=True, code__in=task_codes)
    ).update(budget_amount=0)

    expenses = Expense.objects.filter(project=project).filter(
        Q(linked_task_id__in=task_ids) |
        Q(linked_task__isnull=True, budget_line__linked_task_id__in=task_ids)
    )
    deleted_count = expenses.count()
    expenses.delete()
    return Response({
        "tasks_reset": len(task_ids),
        "expenses_deleted": deleted_count,
    })
