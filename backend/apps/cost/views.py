"""Cost views -- budget lines, expenses, cost summary, EVM, project overview."""
from decimal import Decimal

from django.db.models import Count, Sum
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
from .services import get_cost_summary, get_evm_metrics, get_project_overview


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

    tasks = ProjectTask.objects.filter(project=project).order_by("sort_order", "code")

    # Pre-compute expense aggregation per task in one query
    expense_agg = dict(
        Expense.objects.filter(project=project, linked_task__isnull=False)
        .values("linked_task")
        .annotate(total=Sum("amount"))
        .values_list("linked_task", "total")
    )
    expense_counts = dict(
        Expense.objects.filter(project=project, linked_task__isnull=False)
        .values("linked_task")
        .annotate(cnt=Count("id"))
        .values_list("linked_task", "cnt")
    )

    # Project start for calendar date computation
    from datetime import timedelta
    proj_start = project.start_date

    rows = []
    for t in tasks:
        actual = float(expense_agg.get(t.id, 0) or 0)
        budget = float(t.budget)
        pred_codes = list(
            t.predecessor_links.select_related("predecessor")
            .values_list("predecessor__code", flat=True)
        )
        start_date = str(proj_start + timedelta(days=t.early_start)) if proj_start else None
        end_date = str(proj_start + timedelta(days=t.early_finish)) if proj_start else None

        rows.append({
            "id": str(t.id),
            "code": t.code,
            "name": t.name,
            "is_parent": t.is_parent,
            "is_critical": t.is_critical,
            "predecessor_codes": pred_codes,
            "early_start": t.early_start,
            "early_finish": t.early_finish,
            "start_date": t.planned_start or start_date,
            "end_date": t.planned_end or end_date,
            "budget": budget,
            "actual": actual,
            "variance": budget - actual,
            "expense_count": expense_counts.get(t.id, 0),
            "status": t.status,
            "status_display": t.get_status_display(),
            "progress": t.progress,
        })

    # Totals
    total_budget = sum(r["budget"] for r in rows)
    total_actual = sum(r["actual"] for r in rows)

    return Response({
        "rows": rows,
        "totals": {
            "budget": total_budget,
            "actual": total_actual,
            "variance": total_budget - total_actual,
        },
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
        expenses = Expense.objects.filter(project=project, linked_task=task)
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

    ProjectTask.objects.filter(project=project).update(budget=0)
    deleted_count = Expense.objects.filter(project=project).count()
    Expense.objects.filter(project=project).delete()
    return Response({
        "tasks_reset": ProjectTask.objects.filter(project=project).count(),
        "expenses_deleted": deleted_count,
    })
