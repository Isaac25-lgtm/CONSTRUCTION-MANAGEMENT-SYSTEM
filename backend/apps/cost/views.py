"""Cost views -- budget lines, expenses, cost summary, EVM, project overview."""
from django.db.models import Q
from django.http import FileResponse
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.documents.validators import validate_upload
from apps.projects.models import Project
from apps.scheduling.models import ProjectTask
from .models import BudgetLine, Expense, ExpenseAttachment
from .serializers import (
    BudgetLineSerializer, BudgetLineCreateSerializer,
    ExpenseAttachmentSerializer, ExpenseSerializer, ExpenseCreateSerializer,
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


def _get_expense_or_404(project, expense_id):
    try:
        return (
            Expense.objects.filter(project=project)
            .select_related("budget_line", "linked_task")
            .prefetch_related("attachments")
            .get(pk=expense_id)
        )
    except Expense.DoesNotExist:
        return None


def _get_attachment_or_404(expense, attachment_id):
    try:
        return expense.attachments.get(pk=attachment_id)
    except ExpenseAttachment.DoesNotExist:
        return None


def _create_expense_attachments(expense, uploaded_files, user):
    attachments = []
    for uploaded_file in uploaded_files:
        validate_upload(uploaded_file)
        attachments.append(
            ExpenseAttachment(
                expense=expense,
                file=uploaded_file,
                original_filename=getattr(uploaded_file, "name", "") or "",
                file_size=getattr(uploaded_file, "size", 0) or 0,
                content_type=getattr(uploaded_file, "content_type", "") or "",
                created_by=user,
                updated_by=user,
            )
        )
    if attachments:
        ExpenseAttachment.objects.bulk_create(attachments)


def _extract_uploaded_files(request):
    files = list(request.FILES.getlist("files"))
    if not files and request.FILES.get("files"):
        files = [request.FILES["files"]]
    return files


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
@parser_classes([JSONParser, MultiPartParser, FormParser])
def expense_list(request, project_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        expenses = (
            Expense.objects.filter(project=project)
            .select_related("budget_line", "linked_task")
            .prefetch_related("attachments")
        )
        return Response(ExpenseSerializer(expenses, many=True, context={"request": request}).data)

    if not _can_edit_budget(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    data = request.data.copy()
    data.pop("files", None)
    serializer = ExpenseCreateSerializer(
        data=data,
        context={"request": request, "project": project},
    )
    serializer.is_valid(raise_exception=True)
    exp = serializer.save(project=project, created_by=request.user)
    _create_expense_attachments(exp, _extract_uploaded_files(request), request.user)
    exp.refresh_from_db()
    return Response(
        ExpenseSerializer(exp, context={"request": request}).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def expense_detail(request, project_id, expense_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    exp = _get_expense_or_404(project, expense_id)
    if not exp:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(ExpenseSerializer(exp, context={"request": request}).data)

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
@parser_classes([JSONParser, MultiPartParser, FormParser])
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
        ).select_related("budget_line", "linked_task").prefetch_related("attachments").distinct()
        return Response(ExpenseSerializer(expenses, many=True, context={"request": request}).data)

    if not _can_edit_budget(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    data = request.data.copy()
    data["linked_task"] = str(task.id)
    data.pop("files", None)
    serializer = ExpenseCreateSerializer(
        data=data,
        context={"request": request, "project": project},
    )
    serializer.is_valid(raise_exception=True)
    exp = serializer.save(project=project, created_by=request.user)
    _create_expense_attachments(exp, _extract_uploaded_files(request), request.user)
    exp.refresh_from_db()
    return Response(
        ExpenseSerializer(exp, context={"request": request}).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def expense_attachment_upload(request, project_id, expense_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if not _can_edit_budget(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    expense = _get_expense_or_404(project, expense_id)
    if not expense:
        return Response(status=status.HTTP_404_NOT_FOUND)

    uploaded_files = _extract_uploaded_files(request)
    if not uploaded_files:
        return Response({"files": "At least one file is required."}, status=status.HTTP_400_BAD_REQUEST)

    _create_expense_attachments(expense, uploaded_files, request.user)
    expense.refresh_from_db()
    return Response(
        ExpenseAttachmentSerializer(
            expense.attachments.all(),
            many=True,
            context={"request": request},
        ).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def expense_attachment_delete(request, project_id, expense_id, attachment_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if not _can_edit_budget(request, project):
        return Response(status=status.HTTP_403_FORBIDDEN)

    expense = _get_expense_or_404(project, expense_id)
    if not expense:
        return Response(status=status.HTTP_404_NOT_FOUND)

    attachment = _get_attachment_or_404(expense, attachment_id)
    if not attachment:
        return Response(status=status.HTTP_404_NOT_FOUND)

    attachment.file.delete(save=False)
    attachment.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def expense_attachment_download(request, project_id, expense_id, attachment_id):
    project = _get_project_or_404(request, project_id)
    if not project:
        return Response(status=status.HTTP_404_NOT_FOUND)

    expense = _get_expense_or_404(project, expense_id)
    if not expense:
        return Response(status=status.HTTP_404_NOT_FOUND)

    attachment = _get_attachment_or_404(expense, attachment_id)
    if not attachment:
        return Response(status=status.HTTP_404_NOT_FOUND)

    return FileResponse(
        attachment.file.open("rb"),
        as_attachment=True,
        filename=attachment.original_filename or attachment.file.name.rsplit("/", 1)[-1],
    )


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
