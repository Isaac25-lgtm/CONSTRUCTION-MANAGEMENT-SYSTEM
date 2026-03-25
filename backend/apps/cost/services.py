"""
Cost services -- task-centric and legacy cost summaries, variance, and EVM calculations.

EVM Assumptions (Phase 3 - v1):
  - BAC (Budget at Completion) = sum of the active project budget structure
    (task-centric when the prototype cost sheet is in use, otherwise budget lines)
  - BCWP (Earned Value) = BAC * (overall schedule progress / 100)
    where progress = avg task progress from scheduling module
  - BCWS (Planned Value) = sum of baseline task budgets * baseline progress,
    or BAC * 0.5 if no baseline exists (mid-project assumption)
  - ACWP (Actual Cost) = sum of the same cost source used for BAC
  - CPI = BCWP / ACWP (cost performance index)
  - SPI = BCWP / BCWS (schedule performance index)
  - EAC = BAC / CPI (estimate at completion)
  - VAC = BAC - EAC (variance at completion)

These are deterministic calculations. No AI involvement.
Calendar-day based, matching the scheduling engine's approach.
"""
from decimal import Decimal
from datetime import timedelta

from django.db.models import Sum

from .models import BudgetLine, Expense
from apps.scheduling.engine import get_critical_path_codes


def build_task_cost_table(project):
    """
    Assemble the prototype-style task cost table for a project.

    Expenses created through either the new task-expense flow or the older
    budget-line flow are rolled up against the task whenever a linked task exists.
    """
    from apps.scheduling.models import ProjectTask

    tasks = list(
        ProjectTask.objects.filter(project=project)
        .prefetch_related("predecessor_links__predecessor")
        .order_by("sort_order", "code")
    )
    if not tasks:
        return None

    expenses = Expense.objects.filter(project=project).select_related("budget_line")
    actual_by_task = {}
    count_by_task = {}
    unlinked_actual = Decimal("0")
    unlinked_count = 0

    for expense in expenses:
        task_id = expense.linked_task_id
        if task_id is None and expense.budget_line_id and expense.budget_line and expense.budget_line.linked_task_id:
            task_id = expense.budget_line.linked_task_id

        if task_id is None:
            unlinked_actual += expense.amount
            unlinked_count += 1
            continue

        actual_by_task[task_id] = actual_by_task.get(task_id, Decimal("0")) + expense.amount
        count_by_task[task_id] = count_by_task.get(task_id, 0) + 1

    rows = []
    total_budget = Decimal("0")
    total_actual = Decimal("0")

    for task in tasks:
        budget = Decimal(task.budget or 0)
        actual = actual_by_task.get(task.id, Decimal("0"))
        total_budget += budget
        total_actual += actual

        computed_start = None
        computed_end = None
        if project.start_date:
            computed_start = project.start_date + timedelta(days=task.early_start)
            computed_end = project.start_date + timedelta(days=task.early_finish)

        rows.append({
            "id": str(task.id),
            "code": task.code,
            "name": task.name,
            "is_parent": task.is_parent,
            "is_critical": task.is_critical,
            "predecessor_codes": list(
                task.predecessor_links.values_list("predecessor__code", flat=True)
            ),
            "early_start": task.early_start,
            "early_finish": task.early_finish,
            "start_date": str(task.planned_start or computed_start) if (task.planned_start or computed_start) else None,
            "end_date": str(task.planned_end or computed_end) if (task.planned_end or computed_end) else None,
            "budget": float(budget),
            "actual": float(actual),
            "variance": float(budget - actual),
            "expense_count": count_by_task.get(task.id, 0),
            "status": task.status,
            "status_display": task.get_status_display(),
            "progress": task.progress,
        })

    return {
        "rows": rows,
        "totals": {
            "budget": float(total_budget),
            "actual": float(total_actual),
            "variance": float(total_budget - total_actual),
        },
        "project_budget": float(project.budget),
        "unlinked_actual": float(unlinked_actual),
        "unlinked_expenses_count": unlinked_count,
    }


def use_task_cost_source(project, task_table=None):
    """
    Decide whether shared summaries should use the new task-centric cost source.

    We prefer the prototype task sheet when:
    - the project has no legacy budget-line structure at all, or
    - any task has a budget/actual/expense count, or
    - legacy budget lines are explicitly linked to tasks
    """
    if task_table is None:
        task_table = build_task_cost_table(project)
    if not task_table:
        return False

    if not BudgetLine.objects.filter(project=project).exists():
        return True

    if BudgetLine.objects.filter(project=project, linked_task__isnull=False).exists():
        return True

    return any(
        row["budget"] > 0 or row["actual"] > 0 or row["expense_count"] > 0
        for row in task_table["rows"]
    )


def get_cost_summary(project):
    """
    Return cost summary for a project.

    Returns dict with: total_budget, total_actual, variance, budget_lines_count,
    expenses_count, category_breakdown.
    """
    task_table = build_task_cost_table(project)
    if use_task_cost_source(project, task_table):
        total_budget = Decimal(str(task_table["totals"]["budget"]))
        total_actual = Decimal(str(task_table["totals"]["actual"]))
        variance = total_budget - total_actual
        return {
            "total_budget": float(total_budget),
            "total_actual": float(total_actual),
            "variance": float(variance),
            "is_over_budget": total_actual > total_budget,
            "budget_utilisation": float(
                (total_actual / total_budget * 100) if total_budget > 0 else 0
            ),
            "budget_lines_count": len(task_table["rows"]),
            "expenses_count": sum(row["expense_count"] for row in task_table["rows"]),
            "category_breakdown": {},
        }

    budget_lines = BudgetLine.objects.filter(project=project)
    total_budget = budget_lines.aggregate(t=Sum("budget_amount"))["t"] or Decimal("0")

    expenses = Expense.objects.filter(project=project)
    total_actual = expenses.aggregate(t=Sum("amount"))["t"] or Decimal("0")

    variance = total_budget - total_actual

    categories = {}
    for bl in budget_lines:
        cat = bl.get_category_display()
        if cat not in categories:
            categories[cat] = {"budget": Decimal("0"), "actual": Decimal("0")}
        categories[cat]["budget"] += bl.budget_amount
        categories[cat]["actual"] += Decimal(str(bl.actual_amount))

    return {
        "total_budget": float(total_budget),
        "total_actual": float(total_actual),
        "variance": float(variance),
        "is_over_budget": total_actual > total_budget,
        "budget_utilisation": float(
            (total_actual / total_budget * 100) if total_budget > 0 else 0
        ),
        "budget_lines_count": budget_lines.count(),
        "expenses_count": expenses.count(),
        "category_breakdown": {
            k: {"budget": float(v["budget"]), "actual": float(v["actual"]),
                "variance": float(v["budget"] - v["actual"])}
            for k, v in categories.items()
        },
    }


def get_evm_metrics(project):
    """
    Calculate EVM metrics for a project.

    Uses schedule progress from scheduling module and cost data from cost module.
    See module docstring for assumptions.
    """
    from apps.scheduling.models import ProjectTask, ScheduleBaseline, BaselineTaskSnapshot

    cost_summary = get_cost_summary(project)
    bac = float(cost_summary["total_budget"])

    # Overall progress from scheduling -- leaf tasks only (consistent with overview)
    tasks = ProjectTask.objects.filter(project=project, is_parent=False)
    total_tasks = tasks.count()
    if total_tasks > 0:
        overall_progress = sum(t.progress for t in tasks) / total_tasks / 100
    else:
        overall_progress = 0.0

    # BCWP (Earned Value) = BAC * progress fraction
    bcwp = bac * overall_progress

    # BCWS (Planned Value) from baseline if exists
    active_baseline = ScheduleBaseline.objects.filter(
        project=project, is_active=True
    ).first()

    if active_baseline:
        snapshots = BaselineTaskSnapshot.objects.filter(baseline=active_baseline)
        if snapshots.exists():
            baseline_total_budget = float(
                snapshots.aggregate(t=Sum("budget"))["t"] or 0
            )
            baseline_earned = sum(
                float(s.budget) * (s.progress / 100) for s in snapshots
            )
            bcws = baseline_earned if baseline_earned > 0 else bac * 0.5
        else:
            bcws = bac * 0.5
    else:
        # No baseline -- assume mid-project planned value
        bcws = bac * 0.5

    # ACWP (Actual Cost) = same cost source as BAC
    acwp = float(cost_summary["total_actual"])

    # Derived metrics
    cpi = bcwp / acwp if acwp > 0 else 0.0
    spi = bcwp / bcws if bcws > 0 else 0.0
    eac = bac / cpi if cpi > 0 else bac
    vac = bac - eac

    return {
        "bac": round(bac),
        "bcwp": round(bcwp),
        "bcws": round(bcws),
        "acwp": round(acwp),
        "cpi": round(cpi, 2),
        "spi": round(spi, 2),
        "eac": round(eac),
        "vac": round(vac),
        "has_baseline": active_baseline is not None,
        "overall_progress": round(overall_progress * 100, 1),
    }


def get_project_overview(project):
    """
    Assemble a complete project overview combining project, schedule, and cost data.

    Returns a dict suitable for the Overview & EVM frontend module.
    """
    from apps.scheduling.models import ProjectTask, Milestone

    # Schedule summary -- use leaf tasks for execution KPIs
    all_tasks = ProjectTask.objects.filter(project=project)
    leaf_tasks = all_tasks.filter(is_parent=False)
    total_tasks = leaf_tasks.count()
    completed = leaf_tasks.filter(status="completed").count()
    in_progress = leaf_tasks.filter(status="in_progress").count()
    delayed = leaf_tasks.filter(status="delayed").count()
    critical = leaf_tasks.filter(is_critical=True).count()
    duration = max((t.early_finish for t in all_tasks), default=0)
    progress = round(sum(t.progress for t in leaf_tasks) / max(total_tasks, 1))
    critical_path = get_critical_path_codes(project.id)

    # Milestones
    milestones = Milestone.objects.filter(project=project)
    ms_total = milestones.count()
    ms_achieved = milestones.filter(status="achieved").count()
    ms_pending = milestones.filter(status="pending").count()

    # Cost summary
    cost = get_cost_summary(project)

    # EVM
    evm = get_evm_metrics(project)

    return {
        "project": {
            "id": str(project.id),
            "code": project.code,
            "name": project.name,
            "status": project.status,
            "status_display": project.get_status_display(),
            "location": project.location,
            "project_manager_name": project.project_manager_name,
            "start_date": str(project.start_date) if project.start_date else None,
            "end_date": str(project.end_date) if project.end_date else None,
            "budget": float(project.budget),
            "client_name": project.client_name,
            "consultant": project.consultant,
        },
        "schedule": {
            "total_tasks": total_tasks,
            "completed": completed,
            "in_progress": in_progress,
            "delayed": delayed,
            "critical_count": critical,
            "project_duration": duration,
            "overall_progress": progress,
            "critical_path": critical_path,
        },
        "milestones": {
            "total": ms_total,
            "achieved": ms_achieved,
            "pending": ms_pending,
            "items": list(milestones.values("name", "status", "target_date")[:10]),
        },
        "cost": cost,
        "evm": evm,
    }
