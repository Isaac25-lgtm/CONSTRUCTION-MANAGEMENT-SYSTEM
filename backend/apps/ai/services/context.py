"""Context assembly for AI features.

Gathers structured project data for AI prompts in a permission-aware way.
Only includes data from modules the user has access to.
"""
from apps.cost.services import get_project_overview, get_evm_metrics


def assemble_project_context(project, *, user_perms=None,
                              include_schedule=True, include_cost=True,
                              include_risks=False, include_field_ops=False):
    """Build a structured text context block from project data.

    user_perms: set of permission strings the user holds on this project.
    If None, all sections are included (backward compat for admin/system use).
    """
    perms = user_perms or set()
    sections = []

    # Project identity (always included if user has project.view)
    sections.append(f"PROJECT: {project.name} ({project.code})")
    sections.append(f"Type: {project.get_project_type_display()} | Contract: {project.get_contract_type_display()}")
    sections.append(f"Status: {project.get_status_display()}")
    sections.append(
        f"Client: {project.client_name or 'N/A'} | Manager: {project.project_manager_name or 'N/A'} | Location: {project.location or 'N/A'}"
    )
    if project.start_date:
        sections.append(f"Start: {project.start_date} | End: {project.end_date or 'TBD'}")
    sections.append("")

    if include_schedule and (user_perms is None or "schedule.view" in perms):
        _add_schedule_context(project, sections)
    elif include_schedule:
        sections.append("SCHEDULE: [No access]")
        sections.append("")

    if include_cost and (user_perms is None or "budget.view" in perms):
        _add_cost_context(project, sections)
    elif include_cost:
        sections.append("COST: [No access]")
        sections.append("")

    if include_risks and (user_perms is None or "risks.view" in perms):
        _add_risk_context(project, sections)

    if include_field_ops and (user_perms is None or "rfis.view" in perms or "changes.view" in perms):
        _add_field_ops_context(project, sections, perms)

    return "\n".join(sections)


def _add_schedule_context(project, sections):
    """Add schedule summary to context."""
    from apps.scheduling.models import ProjectTask, Milestone
    tasks = ProjectTask.objects.filter(project=project, is_parent=False)
    total = tasks.count()
    completed = tasks.filter(status="completed").count()
    critical = tasks.filter(is_critical=True).count()
    avg_progress = 0
    if total > 0:
        from django.db.models import Avg
        avg_progress = tasks.aggregate(avg=Avg("progress"))["avg"] or 0

    milestones = Milestone.objects.filter(project=project)
    ms_total = milestones.count()
    ms_achieved = milestones.filter(status="achieved").count()

    sections.append("SCHEDULE SUMMARY:")
    sections.append(f"  Tasks: {total} total, {completed} completed, {critical} critical")
    sections.append(f"  Average progress: {avg_progress:.0f}%")
    sections.append(f"  Milestones: {ms_total} total, {ms_achieved} achieved")
    sections.append("")


def _add_cost_context(project, sections):
    """Add cost/EVM summary to context."""
    try:
        overview = get_project_overview(project)
        evm = get_evm_metrics(project)
        cost = overview.get("cost", {})
        sections.append("COST SUMMARY:")
        sections.append(f"  Budget: {cost.get('total_budget', 0):,.0f}")
        sections.append(f"  Actual cost: {cost.get('total_actual', 0):,.0f}")
        sections.append(f"  Variance: {cost.get('variance', 0):,.0f}")
        sections.append(f"  CPI: {evm.get('cpi', 0):.2f} | SPI: {evm.get('spi', 0):.2f}")
        sections.append(f"  EAC: {evm.get('eac', 0):,.0f}")
        sections.append("")
    except Exception:
        sections.append("COST SUMMARY: Not available")
        sections.append("")


def _add_risk_context(project, sections):
    """Add risk summary to context."""
    from apps.risks.models import Risk
    risks = Risk.objects.filter(project=project, deleted_at__isnull=True)
    total = risks.count()
    high = risks.filter(impact__in=["high", "critical"]).count()
    open_risks = risks.filter(status="open").count()
    sections.append(f"RISKS: {total} total, {open_risks} open, {high} high/critical impact")
    sections.append("")


def _add_field_ops_context(project, sections, perms=None):
    """Add field ops summary to context, respecting module permissions."""
    perms = perms or set()

    if perms is None or "rfis.view" in perms:
        from apps.rfis.models import RFI
        rfis = RFI.objects.filter(project=project)
        open_rfis = rfis.filter(status="open").count()
        overdue_rfis = sum(1 for r in rfis if r.is_overdue)
        sections.append(f"RFIs: {rfis.count()} total, {open_rfis} open, {overdue_rfis} overdue")

    if perms is None or "changes.view" in perms:
        from apps.changes.models import ChangeOrder
        changes = ChangeOrder.objects.filter(project=project)
        pending_changes = changes.filter(status="pending").count()
        sections.append(f"Change Orders: {changes.count()} total, {pending_changes} pending approval")

    sections.append("")
