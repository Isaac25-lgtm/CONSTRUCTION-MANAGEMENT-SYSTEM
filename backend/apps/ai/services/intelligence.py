"""Project intelligence snapshots for the AI workspace.

This module assembles a fast, deterministic project-health payload for the
frontend. It complements the existing text-generation features by providing:
  - health signals
  - action recommendations
  - chart-ready datasets
  - suggested questions for the copilot
"""
from __future__ import annotations

from typing import Iterable

from apps.cost.services import get_project_overview


HEALTH_PRIORITY = {"healthy": 0, "watch": 1, "critical": 2}


def build_project_intelligence(project, *, user_perms: Iterable[str] | None = None) -> dict:
    perms = set(user_perms or [])
    overview = get_project_overview(project)
    schedule = overview["schedule"]
    cost = overview["cost"]
    evm = overview["evm"]

    risk_summary = _build_risk_summary(project, perms)
    operations_summary = _build_operations_summary(project, perms)
    procurement_summary = _build_procurement_summary(project, perms)
    documents_summary = _build_documents_summary(project, perms)
    communications_summary = _build_communications_summary(project, perms)

    health = {
        "schedule": _build_schedule_health(schedule, evm, project.status),
        "cost": _build_cost_health(cost, evm, project.status),
        "risk": _build_risk_health(risk_summary, project.status),
        "operations": _build_operations_health(
            operations_summary,
            procurement_summary,
            communications_summary,
            project.status,
        ),
    }
    health["overall"] = _build_overall_health(health, project.status)

    charts = {
        "progress_distribution": _build_progress_chart(schedule),
        "evm_indices": _build_evm_chart(evm),
        "budget_categories": _build_budget_chart(cost),
        "risk_mix": _build_risk_chart(risk_summary),
    }

    actions = _build_priority_actions(
        project=project,
        overview=overview,
        risk_summary=risk_summary,
        operations_summary=operations_summary,
        procurement_summary=procurement_summary,
        communications_summary=communications_summary,
        health=health,
    )

    highlights = _build_highlights(overview, risk_summary, operations_summary, procurement_summary)
    narrative = _build_workspace_narrative(project, overview, health, actions)

    return {
        "project": overview["project"],
        "health": health,
        "highlights": highlights,
        "module_summaries": {
            "risks": risk_summary,
            "operations": operations_summary,
            "procurement": procurement_summary,
            "documents": documents_summary,
            "communications": communications_summary,
        },
        "charts": charts,
        "recommended_actions": actions,
        "suggested_questions": _build_suggested_questions(project, health, risk_summary, operations_summary),
        "narrative": narrative,
        "overview": overview,
    }


def _build_schedule_health(schedule: dict, evm: dict, project_status: str) -> dict:
    if project_status == "completed":
        return {
            "state": "healthy",
            "label": "Completed",
            "reason": "The schedule has been finished and the project is marked complete.",
        }

    delayed = schedule["delayed"]
    spi = evm["spi"]
    if delayed >= 3 or (spi and spi < 0.9):
        return {
            "state": "critical",
            "label": "Recovery Needed",
            "reason": f"{delayed} delayed tasks and SPI {spi:.2f} indicate schedule slippage.",
        }
    if delayed > 0 or (spi and spi < 1):
        return {
            "state": "watch",
            "label": "Watch Schedule",
            "reason": f"{delayed} delayed tasks or SPI {spi:.2f} show mild delivery pressure.",
        }
    return {
        "state": "healthy",
        "label": "On Track",
        "reason": "No significant task slippage is visible in the current programme snapshot.",
    }


def _build_cost_health(cost: dict, evm: dict, project_status: str) -> dict:
    if project_status == "completed":
        label = "Closed Out" if cost["variance"] >= 0 else "Closed With Overrun"
        return {
            "state": "healthy" if cost["variance"] >= 0 else "watch",
            "label": label,
            "reason": "Cost exposure is now mainly about final close-out and commercial settlement.",
        }

    cpi = evm["cpi"]
    negative_variance = cost["variance"] < 0
    severe_overrun = cost["total_budget"] > 0 and abs(cost["variance"]) > cost["total_budget"] * 0.05
    if (cpi and cpi < 0.9) or (negative_variance and severe_overrun):
        return {
            "state": "critical",
            "label": "Cost Pressure",
            "reason": f"CPI {cpi:.2f} and current variance point to cost recovery being required.",
        }
    if negative_variance or (cpi and cpi < 1):
        return {
            "state": "watch",
            "label": "Tight Spend",
            "reason": f"CPI {cpi:.2f} or negative variance suggests tighter spend control is needed.",
        }
    return {
        "state": "healthy",
        "label": "Cost Stable",
        "reason": "Spend remains within the current budget envelope.",
    }


def _build_risk_health(risk_summary: dict, project_status: str) -> dict:
    if not risk_summary["visible"]:
        return {"state": "healthy", "label": "No Access", "reason": "Risk data is hidden for this user."}
    if project_status == "completed":
        return {"state": "healthy", "label": "Residual Risk Only", "reason": "The project is complete and active delivery risk is reduced."}

    open_high = risk_summary["open_high_impact"]
    open_total = risk_summary["open"]
    if open_high >= 2 or open_total >= 5:
        return {
            "state": "critical",
            "label": "Escalate Risks",
            "reason": f"{open_high} high-impact open risks require senior attention.",
        }
    if open_high >= 1 or open_total >= 3:
        return {
            "state": "watch",
            "label": "Risk Review",
            "reason": f"{open_total} open risks need active monitoring.",
        }
    return {
        "state": "healthy",
        "label": "Risk Controlled",
        "reason": "No concentration of unresolved high-impact risks is visible.",
    }


def _build_operations_health(
    operations_summary: dict,
    procurement_summary: dict,
    communications_summary: dict,
    project_status: str,
) -> dict:
    if project_status == "completed":
        return {
            "state": "healthy",
            "label": "Close-Out Mode",
            "reason": "Operational focus should now be on handover, defects, and final records.",
        }

    overdue_rfis = operations_summary["overdue_rfis"]
    safety_open = operations_summary["open_safety_incidents"]
    pending_quality = operations_summary["pending_quality_checks"]
    overdue_actions = communications_summary["overdue_actions"]
    pending_invoices = procurement_summary["pending_invoices"]

    if overdue_rfis >= 2 or safety_open >= 1 or overdue_actions >= 2:
        return {
            "state": "critical",
            "label": "Operational Friction",
            "reason": "Outstanding coordination items are now at a level that can slow delivery.",
        }
    if overdue_rfis >= 1 or pending_quality >= 1 or pending_invoices >= 1 or overdue_actions >= 1:
        return {
            "state": "watch",
            "label": "Watch Operations",
            "reason": "A few unresolved field or commercial actions need follow-up.",
        }
    return {
        "state": "healthy",
        "label": "Flowing Well",
        "reason": "Field coordination and day-to-day delivery signals look stable.",
    }


def _build_overall_health(health: dict, project_status: str) -> dict:
    if project_status == "completed":
        return {
            "state": "healthy",
            "label": "Completed",
            "reason": "The project is marked complete. Focus on retention, records, and lessons learned.",
        }
    worst = max(
        ("schedule", "cost", "risk", "operations"),
        key=lambda key: HEALTH_PRIORITY[health[key]["state"]],
    )
    state = health[worst]["state"]
    label = {
        "healthy": "Healthy",
        "watch": "Needs Attention",
        "critical": "Executive Attention",
    }[state]
    return {
        "state": state,
        "label": label,
        "reason": health[worst]["reason"],
    }


def _build_risk_summary(project, perms: set[str]) -> dict:
    if perms and "risks.view" not in perms:
        return {
            "visible": False,
            "total": 0,
            "open": 0,
            "open_high_impact": 0,
            "impact_breakdown": [],
            "top_items": [],
        }

    from apps.risks.models import Risk

    risks = Risk.objects.filter(project=project, deleted_at__isnull=True)
    impact_counts = {
        "critical": risks.filter(impact="critical").count(),
        "high": risks.filter(impact="high").count(),
        "medium": risks.filter(impact="medium").count(),
        "low": risks.filter(impact="low").count(),
    }
    open_risks = risks.filter(status="open")
    top_items = list(
        open_risks.order_by("-created_at").values("code", "title", "impact", "status")[:3]
    )
    return {
        "visible": True,
        "total": risks.count(),
        "open": open_risks.count(),
        "open_high_impact": open_risks.filter(impact__in=["high", "critical"]).count(),
        "impact_breakdown": [
            {"label": "Critical", "value": impact_counts["critical"], "color": "#dc2626"},
            {"label": "High", "value": impact_counts["high"], "color": "#f97316"},
            {"label": "Medium", "value": impact_counts["medium"], "color": "#f59e0b"},
            {"label": "Low", "value": impact_counts["low"], "color": "#22c55e"},
        ],
        "top_items": top_items,
    }


def _build_operations_summary(project, perms: set[str]) -> dict:
    summary = {
        "visible": True,
        "rfis": 0,
        "open_rfis": 0,
        "overdue_rfis": 0,
        "change_orders": 0,
        "pending_changes": 0,
        "daily_logs": 0,
        "open_safety_incidents": 0,
        "pending_quality_checks": 0,
    }

    if not perms or "rfis.view" in perms:
        from apps.rfis.models import RFI

        rfis = list(RFI.objects.filter(project=project))
        summary["rfis"] = len(rfis)
        summary["open_rfis"] = sum(1 for item in rfis if item.status == "open")
        summary["overdue_rfis"] = sum(1 for item in rfis if item.is_overdue)

    if not perms or "changes.view" in perms:
        from apps.changes.models import ChangeOrder

        changes = ChangeOrder.objects.filter(project=project)
        summary["change_orders"] = changes.count()
        summary["pending_changes"] = changes.filter(status__in=["draft", "submitted"]).count()

    if not perms or "field_ops.view" in perms:
        from apps.field_ops.models import DailyLog, SafetyIncident, QualityCheck

        summary["daily_logs"] = DailyLog.objects.filter(project=project).count()
        summary["open_safety_incidents"] = SafetyIncident.objects.filter(
            project=project, status__in=["open", "investigating"]
        ).count()
        summary["pending_quality_checks"] = QualityCheck.objects.filter(
            project=project, result__in=["fail", "conditional", "pending"]
        ).count()

    return summary


def _build_procurement_summary(project, perms: set[str]) -> dict:
    if perms and "procurement.view" not in perms:
        return {
            "visible": False,
            "purchase_orders": 0,
            "open_purchase_orders": 0,
            "pending_invoices": 0,
        }

    from apps.procurement.models import PurchaseOrder, ProcurementInvoice

    purchase_orders = PurchaseOrder.objects.filter(project=project)
    invoices = ProcurementInvoice.objects.filter(project=project)
    return {
        "visible": True,
        "purchase_orders": purchase_orders.count(),
        "open_purchase_orders": purchase_orders.exclude(status__in=["delivered", "cancelled"]).count(),
        "pending_invoices": invoices.exclude(status="paid").count(),
    }


def _build_documents_summary(project, perms: set[str]) -> dict:
    if perms and "documents.view" not in perms:
        return {"visible": False, "documents": 0, "latest_upload": None}

    from apps.documents.models import Document

    documents = Document.objects.filter(project=project)
    latest = documents.order_by("-last_uploaded_at").values_list("last_uploaded_at", flat=True).first()
    return {
        "visible": True,
        "documents": documents.count(),
        "latest_upload": latest.isoformat() if latest else None,
    }


def _build_communications_summary(project, perms: set[str]) -> dict:
    if perms and "comms.view" not in perms:
        return {"visible": False, "meetings": 0, "open_actions": 0, "overdue_actions": 0}

    from django.utils import timezone
    from apps.comms.models import Meeting, MeetingAction

    meetings = Meeting.objects.filter(project=project)
    actions = MeetingAction.objects.filter(meeting__project=project)
    today = timezone.now().date()
    return {
        "visible": True,
        "meetings": meetings.count(),
        "open_actions": actions.exclude(status__in=["completed", "cancelled"]).count(),
        "overdue_actions": actions.filter(
            status__in=["open", "in_progress"],
            due_date__lt=today,
        ).count(),
    }


def _build_progress_chart(schedule: dict) -> list[dict]:
    pending = max(
        schedule["total_tasks"] - schedule["completed"] - schedule["in_progress"] - schedule["delayed"],
        0,
    )
    return [
        {"label": "Completed", "value": schedule["completed"], "color": "#22c55e"},
        {"label": "In Progress", "value": schedule["in_progress"], "color": "#3b82f6"},
        {"label": "Delayed", "value": schedule["delayed"], "color": "#ef4444"},
        {"label": "Not Started", "value": pending, "color": "#94a3b8"},
    ]


def _build_evm_chart(evm: dict) -> list[dict]:
    return [
        {
            "label": "CPI",
            "value": evm["cpi"],
            "target": 1,
            "color": "#22c55e" if evm["cpi"] >= 1 else "#ef4444",
        },
        {
            "label": "SPI",
            "value": evm["spi"],
            "target": 1,
            "color": "#22c55e" if evm["spi"] >= 1 else "#f97316",
        },
    ]


def _build_budget_chart(cost: dict) -> list[dict]:
    categories = sorted(
        cost["category_breakdown"].items(),
        key=lambda item: item[1]["budget"],
        reverse=True,
    )[:5]
    return [
        {
            "label": label,
            "budget": values["budget"],
            "actual": values["actual"],
            "variance": values["variance"],
            "color": "#22c55e" if values["variance"] >= 0 else "#ef4444",
        }
        for label, values in categories
    ]


def _build_risk_chart(risk_summary: dict) -> list[dict]:
    if not risk_summary["visible"]:
        return []
    return [item for item in risk_summary["impact_breakdown"] if item["value"] > 0]


def _build_priority_actions(
    *,
    project,
    overview: dict,
    risk_summary: dict,
    operations_summary: dict,
    procurement_summary: dict,
    communications_summary: dict,
    health: dict,
) -> list[dict]:
    actions = []
    schedule = overview["schedule"]
    cost = overview["cost"]
    evm = overview["evm"]

    if project.status == "completed":
        actions.append({
            "priority": "medium",
            "title": "Close out final records",
            "detail": "Confirm as-built documents, retention items, and final lessons learned are captured.",
        })
        actions.append({
            "priority": "medium",
            "title": "Resolve remaining defects",
            "detail": "Use the punch list and recent quality checks to make sure no handover items are still open.",
        })
        return actions

    if health["schedule"]["state"] != "healthy":
        actions.append({
            "priority": "critical" if schedule["delayed"] >= 3 else "high",
            "title": "Run a short-term schedule recovery review",
            "detail": f"{schedule['delayed']} delayed tasks and SPI {evm['spi']:.2f} suggest the next two-week lookahead needs resequencing.",
        })

    if health["cost"]["state"] != "healthy":
        actions.append({
            "priority": "critical" if evm["cpi"] and evm["cpi"] < 0.9 else "high",
            "title": "Tighten cost-control on active work fronts",
            "detail": f"Current variance is {cost['variance']:,.0f} with CPI {evm['cpi']:.2f}; review high-spend budget lines first.",
        })

    if risk_summary["visible"] and risk_summary["open_high_impact"] > 0:
        actions.append({
            "priority": "high",
            "title": "Escalate open high-impact risks",
            "detail": f"{risk_summary['open_high_impact']} high-impact risks remain open and should have owners plus mitigation dates.",
        })

    if operations_summary["overdue_rfis"] > 0:
        actions.append({
            "priority": "high",
            "title": "Clear overdue RFIs",
            "detail": f"{operations_summary['overdue_rfis']} RFIs are overdue and can block field decisions or rework.",
        })

    if operations_summary["open_safety_incidents"] > 0:
        actions.append({
            "priority": "critical",
            "title": "Close outstanding safety actions",
            "detail": "Active safety incidents or investigations should be reviewed before the next site shift.",
        })

    if operations_summary["pending_quality_checks"] > 0:
        actions.append({
            "priority": "medium",
            "title": "Address pending quality observations",
            "detail": f"{operations_summary['pending_quality_checks']} quality checks are conditional, failed, or still pending action.",
        })

    if procurement_summary["visible"] and procurement_summary["pending_invoices"] > 0:
        actions.append({
            "priority": "medium",
            "title": "Review pending supplier invoices",
            "detail": f"{procurement_summary['pending_invoices']} supplier invoices are still pending approval or payment.",
        })

    if communications_summary["visible"] and communications_summary["overdue_actions"] > 0:
        actions.append({
            "priority": "medium",
            "title": "Chase overdue meeting actions",
            "detail": f"{communications_summary['overdue_actions']} meeting action items are overdue and need owner follow-up.",
        })

    if not actions:
        actions.append({
            "priority": "medium",
            "title": "Maintain current delivery rhythm",
            "detail": "Use weekly reviews to keep schedule, cost, and field controls aligned while performance is stable.",
        })

    priority_rank = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    return sorted(actions, key=lambda item: priority_rank[item["priority"]])[:5]


def _build_highlights(
    overview: dict,
    risk_summary: dict,
    operations_summary: dict,
    procurement_summary: dict,
) -> list[dict]:
    cost = overview["cost"]
    evm = overview["evm"]
    schedule = overview["schedule"]
    return [
        {
            "label": "Overall Progress",
            "value": f"{schedule['overall_progress']}%",
            "tone": "healthy" if schedule["overall_progress"] >= 75 else "watch" if schedule["overall_progress"] >= 40 else "critical",
            "detail": f"{schedule['completed']} of {schedule['total_tasks']} execution tasks are complete.",
        },
        {
            "label": "Budget Utilisation",
            "value": f"{cost['budget_utilisation']:.1f}%",
            "tone": "critical" if cost["is_over_budget"] else "watch" if cost["budget_utilisation"] >= 75 else "healthy",
            "detail": f"Variance is {cost['variance']:,.0f} against the current baseline budget.",
        },
        {
            "label": "Delivery Indices",
            "value": f"CPI {evm['cpi']:.2f} / SPI {evm['spi']:.2f}",
            "tone": "critical" if evm["cpi"] < 0.9 or evm["spi"] < 0.9 else "watch" if evm["cpi"] < 1 or evm["spi"] < 1 else "healthy",
            "detail": "These values show cost and schedule efficiency against the current plan.",
        },
        {
            "label": "Live Issues",
            "value": str(
                risk_summary["open"] + operations_summary["overdue_rfis"] + procurement_summary["pending_invoices"]
            ),
            "tone": "critical" if risk_summary["open"] >= 5 else "watch" if risk_summary["open"] >= 2 else "healthy",
            "detail": "Combined count of open risks, overdue RFIs, and pending invoices.",
        },
    ]


def _build_workspace_narrative(project, overview: dict, health: dict, actions: list[dict]) -> dict:
    schedule = overview["schedule"]
    cost = overview["cost"]
    evm = overview["evm"]
    headline = (
        f"{project.name} is currently {health['overall']['label'].lower()} "
        f"with {schedule['overall_progress']}% overall progress, CPI {evm['cpi']:.2f}, "
        f"and SPI {evm['spi']:.2f}."
    )
    summary = (
        f"The project has {schedule['completed']} completed execution tasks out of "
        f"{schedule['total_tasks']}, while current spend stands at {cost['total_actual']:,.0f} "
        f"against a budget of {cost['total_budget']:,.0f}."
    )
    guidance = actions[0]["detail"] if actions else "Use the recommended actions panel to steer the next review meeting."
    return {
        "headline": headline,
        "summary": summary,
        "guidance": guidance,
    }


def _build_suggested_questions(project, health: dict, risk_summary: dict, operations_summary: dict) -> list[str]:
    prompts = [
        f"What should the site team do next on {project.name}?",
        f"Draft a weekly executive update for {project.name}.",
        "Which budget lines deserve immediate attention?",
    ]

    if health["schedule"]["state"] != "healthy":
        prompts.insert(0, "What are the best schedule recovery actions for this project?")
    if risk_summary["visible"] and risk_summary["open_high_impact"] > 0:
        prompts.append("Which risks should be escalated to management right now?")
    if operations_summary["overdue_rfis"] > 0:
        prompts.append("How should we clear the overdue RFIs without disrupting site work?")

    # Keep the floating assistant concise.
    deduped = []
    for prompt in prompts:
        if prompt not in deduped:
            deduped.append(prompt)
    return deduped[:5]
