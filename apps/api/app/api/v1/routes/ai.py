"""
AI-Powered Modules for BuildPro
================================
1. AI Chat Assistant          – POST /api/v1/ai/chat
2. Predictive Risk Analytics  – GET  /api/v1/ai/risk-prediction/{project_id}
3. Budget Forecasting         – GET  /api/v1/ai/budget-forecast/{project_id}
4. Automated Reporting        – GET  /api/v1/ai/auto-report/{project_id}
5. Resource Allocation        – GET  /api/v1/ai/resource-allocation/{project_id}

All modules use the Gemini API to analyse real project data and return
structured, actionable insights for construction project managers.
"""

import json
import logging
from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Optional
from uuid import UUID

import google.generativeai as genai
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_org_context, OrgContext
from app.core.config import settings
from app.db.session import get_db
from app.models.boq import BOQItem
from app.models.expense import Expense
from app.models.milestone import Milestone
from app.models.project import Project
from app.models.risk import Risk
from app.models.task import Task

router = APIRouter()
logger = logging.getLogger(__name__)


# ── helpers ────────────────────────────────────────────────────────────────

def _get_gemini_model():
    """Return a configured Gemini model instance."""
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise HTTPException(status_code=503, detail="AI service not configured (missing GEMINI_API_KEY)")
    genai.configure(api_key=api_key)
    return genai.GenerativeModel("gemini-2.0-flash")


def _decimal_to_float(obj: Any) -> Any:
    """Recursively convert Decimal values for JSON serialisation."""
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, dict):
        return {k: _decimal_to_float(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_decimal_to_float(i) for i in obj]
    return obj


def _enum_val(v: Any) -> str:
    return v.value if hasattr(v, "value") else str(v)


def _gather_project_snapshot(db: Session, org_id: UUID, project_id: UUID) -> dict:
    """Collect all relevant project data into a single dict for AI prompts."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == org_id,
        Project.is_deleted == False,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    tasks = db.query(Task).filter(
        Task.project_id == project_id,
        Task.organization_id == org_id,
        Task.is_deleted == False,
    ).all()

    expenses = db.query(Expense).filter(
        Expense.project_id == project_id,
        Expense.organization_id == org_id,
    ).all()

    risks = db.query(Risk).filter(
        Risk.project_id == project_id,
        Risk.organization_id == org_id,
    ).all()

    milestones = db.query(Milestone).filter(
        Milestone.project_id == project_id,
        Milestone.organization_id == org_id,
    ).all()

    boq_items = db.query(BOQItem).filter(
        BOQItem.project_id == project_id,
        BOQItem.organization_id == org_id,
    ).all()

    today = date.today()
    total_budget = float(project.total_budget or 0)
    total_spent = sum(float(e.amount or 0) for e in expenses)
    budget_utilisation = (total_spent / total_budget * 100) if total_budget > 0 else 0

    total_tasks = len(tasks)
    completed_tasks = sum(1 for t in tasks if _enum_val(t.status) in ("Completed", "COMPLETED"))
    overdue_tasks = sum(
        1 for t in tasks
        if t.due_date and t.due_date < today and _enum_val(t.status) not in ("Completed", "COMPLETED")
    )
    avg_progress = (sum(t.progress or 0 for t in tasks) / total_tasks) if total_tasks else 0

    # Schedule variance: days ahead/behind based on timeline progress vs task progress
    if project.start_date and project.end_date:
        total_days = max((project.end_date - project.start_date).days, 1)
        elapsed_days = max((today - project.start_date).days, 0)
        expected_pct = min(elapsed_days / total_days * 100, 100)
        schedule_variance_pct = avg_progress - expected_pct
    else:
        expected_pct = 0
        schedule_variance_pct = 0

    return _decimal_to_float({
        "project": {
            "name": project.project_name,
            "description": project.description,
            "status": _enum_val(project.status),
            "priority": _enum_val(project.priority),
            "start_date": str(project.start_date) if project.start_date else None,
            "end_date": str(project.end_date) if project.end_date else None,
            "total_budget": total_budget,
            "location": project.location,
            "client": project.client_name,
            "contract_type": project.contract_type,
        },
        "financial": {
            "total_budget": total_budget,
            "total_spent": total_spent,
            "remaining": total_budget - total_spent,
            "budget_utilisation_pct": round(budget_utilisation, 1),
            "variance": total_budget - total_spent,
        },
        "schedule": {
            "expected_progress_pct": round(expected_pct, 1),
            "actual_progress_pct": round(avg_progress, 1),
            "schedule_variance_pct": round(schedule_variance_pct, 1),
            "days_remaining": (project.end_date - today).days if project.end_date else None,
        },
        "tasks": {
            "total": total_tasks,
            "completed": completed_tasks,
            "overdue": overdue_tasks,
            "completion_rate_pct": round(completed_tasks / total_tasks * 100, 1) if total_tasks else 0,
            "items": [
                {
                    "name": t.name,
                    "status": _enum_val(t.status),
                    "priority": _enum_val(t.priority),
                    "progress": t.progress,
                    "start_date": str(t.start_date) if t.start_date else None,
                    "due_date": str(t.due_date) if t.due_date else None,
                }
                for t in tasks[:30]  # cap to avoid token overflow
            ],
        },
        "expenses": {
            "total_amount": total_spent,
            "count": len(expenses),
            "by_category": {},
            "items": [
                {
                    "description": e.description,
                    "amount": float(e.amount or 0),
                    "category": e.category,
                    "status": _enum_val(e.status),
                    "date": str(e.expense_date) if e.expense_date else None,
                    "vendor": e.vendor,
                }
                for e in expenses[:30]
            ],
        },
        "risks": {
            "total": len(risks),
            "active": sum(1 for r in risks if _enum_val(r.status) in ("ACTIVE", "Active", "OPEN", "Open")),
            "items": [
                {
                    "title": r.title,
                    "description": r.description,
                    "probability": _enum_val(r.probability),
                    "impact": _enum_val(r.impact),
                    "status": _enum_val(r.status),
                    "category": r.category,
                    "mitigation": r.mitigation_plan,
                }
                for r in risks
            ],
        },
        "milestones": [
            {
                "name": m.name,
                "target_date": str(m.target_date) if m.target_date else None,
                "status": _enum_val(m.status),
                "completion_pct": m.completion_percentage,
            }
            for m in milestones
        ],
        "boq": {
            "total_items": len(boq_items),
            "total_budget_cost": sum(float(b.budget_cost or 0) for b in boq_items),
            "total_actual_cost": sum(float(b.actual_cost or 0) for b in boq_items),
            "items": [
                {
                    "code": b.item_code,
                    "description": b.description,
                    "quantity": float(b.quantity or 0),
                    "rate": float(b.rate or 0),
                    "budget_cost": float(b.budget_cost or 0),
                    "actual_cost": float(b.actual_cost or 0),
                    "weight": b.weight_out_of_10,
                    "pct_complete": b.percent_complete,
                }
                for b in boq_items[:30]
            ],
        },
    })


def _call_gemini(prompt: str, max_tokens: int = 4096) -> str:
    """Send a prompt to Gemini and return the text response."""
    model = _get_gemini_model()
    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=max_tokens,
                temperature=0.3,
            ),
        )
        return response.text
    except Exception as exc:
        logger.exception("Gemini API call failed")
        raise HTTPException(status_code=502, detail=f"AI service error: {str(exc)}")


def _call_gemini_json(prompt: str, max_tokens: int = 4096) -> dict:
    """Call Gemini expecting a JSON response; parse and return it."""
    raw = _call_gemini(prompt, max_tokens)
    # Strip markdown code fences if present
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        lines = lines[1:]  # drop opening ```json
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned = "\n".join(lines)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Return raw text wrapped in a dict
        return {"raw_response": raw}


# ── 1. AI Chat Assistant ──────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    project_context: Optional[dict] = None
    system_prompt: Optional[str] = None


class ChatResponse(BaseModel):
    message: str


@router.post("/chat", response_model=ChatResponse)
async def ai_chat(body: ChatRequest):
    """
    Conversational AI assistant powered by Gemini.
    Accepts project context from the frontend and answers
    questions about schedules, budgets, risks, and delivery.
    """
    system = body.system_prompt or (
        "You are BuildPro AI, an expert construction project management assistant. "
        "Analyse the project data provided and give concise, actionable advice. "
        "Use bullet points and keep responses under 300 words. "
        "Focus on construction-specific insights relevant to East African markets."
    )

    context_str = ""
    if body.project_context:
        context_str = f"\n\nProject context:\n{json.dumps(body.project_context, indent=2, default=str)}"

    prompt = f"{system}{context_str}\n\nUser question: {body.message}"
    reply = _call_gemini(prompt, max_tokens=2048)
    return ChatResponse(message=reply)


# ── 2. Predictive Risk Analytics ──────────────────────────────────────────

@router.get("/risk-prediction/{project_id}")
async def predict_risks(
    project_id: UUID,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db),
):
    """
    Analyses project parameters — budget utilisation, schedule variance,
    resource allocation, task completion trends — and generates risk scores
    with early warning alerts for potential delays and cost overruns.
    """
    snapshot = _gather_project_snapshot(db, ctx.organization.id, project_id)

    prompt = f"""You are a construction risk analyst AI. Analyse this project data and provide a predictive risk assessment.

PROJECT DATA:
{json.dumps(snapshot, indent=2, default=str)}

Respond with valid JSON in this exact structure:
{{
  "overall_risk_score": <number 1-100>,
  "risk_level": "<Low|Medium|High|Critical>",
  "schedule_risk": {{
    "score": <number 1-100>,
    "assessment": "<brief assessment>",
    "early_warnings": ["<warning 1>", "<warning 2>"]
  }},
  "budget_risk": {{
    "score": <number 1-100>,
    "assessment": "<brief assessment>",
    "early_warnings": ["<warning 1>"]
  }},
  "resource_risk": {{
    "score": <number 1-100>,
    "assessment": "<brief assessment>",
    "early_warnings": ["<warning 1>"]
  }},
  "identified_risks": [
    {{
      "title": "<risk title>",
      "probability": "<Low|Medium|High|Very High>",
      "impact": "<Low|Medium|High|Very High>",
      "risk_score": <number 1-25>,
      "category": "<Schedule|Budget|Resource|Quality|External>",
      "recommended_action": "<mitigation action>"
    }}
  ],
  "recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"]
}}

Analyse schedule variance, budget utilisation rate, task completion trends, overdue tasks,
and existing risk register items. Calibrate scores against typical construction project benchmarks.
Be specific to this project's data — do not give generic advice."""

    result = _call_gemini_json(prompt)
    return result


# ── 3. Intelligent Budget Forecasting ─────────────────────────────────────

@router.get("/budget-forecast/{project_id}")
async def forecast_budget(
    project_id: UUID,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db),
):
    """
    Uses historical expenditure patterns and current spending trends to
    project future costs and automatically flag variances exceeding thresholds.
    """
    snapshot = _gather_project_snapshot(db, ctx.organization.id, project_id)

    prompt = f"""You are a construction budget forecasting AI. Analyse spending patterns and project future costs.

PROJECT DATA:
{json.dumps(snapshot, indent=2, default=str)}

Respond with valid JSON in this exact structure:
{{
  "forecast_summary": {{
    "total_budget": <number>,
    "spent_to_date": <number>,
    "projected_total_cost": <number>,
    "projected_variance": <number>,
    "projected_variance_pct": <number>,
    "confidence_level": "<High|Medium|Low>",
    "forecast_status": "<Under Budget|On Track|At Risk|Over Budget>"
  }},
  "monthly_projections": [
    {{
      "month": "<YYYY-MM>",
      "projected_spend": <number>,
      "cumulative_spend": <number>,
      "notes": "<brief note>"
    }}
  ],
  "variance_alerts": [
    {{
      "category": "<Materials|Labor|Equipment|Services|Other>",
      "current_spend": <number>,
      "expected_spend": <number>,
      "variance_pct": <number>,
      "severity": "<Low|Medium|High|Critical>",
      "recommendation": "<action>"
    }}
  ],
  "cost_drivers": ["<driver 1>", "<driver 2>"],
  "savings_opportunities": ["<opportunity 1>", "<opportunity 2>"],
  "recommendations": ["<recommendation 1>", "<recommendation 2>"]
}}

Use the expense history, BOQ data, budget utilisation rate, and project timeline
to generate realistic projections. Flag any category where spend exceeds 10% of expected rate.
Be specific to this project's actual numbers."""

    result = _call_gemini_json(prompt)
    return result


# ── 4. Automated Reporting ────────────────────────────────────────────────

@router.get("/auto-report/{project_id}")
async def generate_auto_report(
    project_id: UUID,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db),
):
    """
    Generates comprehensive progress summaries, variance analyses,
    and performance dashboards without manual intervention.
    """
    snapshot = _gather_project_snapshot(db, ctx.organization.id, project_id)

    prompt = f"""You are a construction project reporting AI. Generate a comprehensive project status report.

PROJECT DATA:
{json.dumps(snapshot, indent=2, default=str)}

Respond with valid JSON in this exact structure:
{{
  "report_title": "Project Status Report — <project name>",
  "report_date": "{date.today().isoformat()}",
  "executive_summary": "<2-3 sentence overview of project health>",
  "overall_status": "<On Track|At Risk|Behind Schedule|Critical>",
  "overall_health_score": <number 1-100>,
  "schedule_performance": {{
    "status": "<Ahead|On Track|Behind|Critical>",
    "summary": "<brief summary>",
    "key_metrics": {{
      "planned_progress_pct": <number>,
      "actual_progress_pct": <number>,
      "schedule_variance_pct": <number>,
      "tasks_completed": <number>,
      "tasks_overdue": <number>
    }}
  }},
  "budget_performance": {{
    "status": "<Under Budget|On Track|Over Budget|Critical>",
    "summary": "<brief summary>",
    "key_metrics": {{
      "total_budget": <number>,
      "spent_to_date": <number>,
      "budget_utilisation_pct": <number>,
      "projected_at_completion": <number>
    }}
  }},
  "risk_summary": {{
    "status": "<Low|Medium|High|Critical>",
    "summary": "<brief summary>",
    "active_risks": <number>,
    "top_risks": ["<risk 1>", "<risk 2>"]
  }},
  "milestone_progress": [
    {{
      "name": "<milestone>",
      "target_date": "<date>",
      "status": "<status>",
      "completion_pct": <number>
    }}
  ],
  "key_achievements": ["<achievement 1>", "<achievement 2>"],
  "concerns_and_issues": ["<concern 1>", "<concern 2>"],
  "upcoming_actions": ["<action 1>", "<action 2>"],
  "recommendations": ["<recommendation 1>", "<recommendation 2>"]
}}

Generate a professional project status report based on the actual data.
Use real numbers from the data — do not fabricate figures.
The report should be suitable for stakeholder review."""

    result = _call_gemini_json(prompt)
    return result


# ── 5. AI-Driven Resource Allocation ──────────────────────────────────────

@router.get("/resource-allocation/{project_id}")
async def recommend_resources(
    project_id: UUID,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db),
):
    """
    Recommends optimal distribution of labour, materials, and equipment
    based on project phase, historical productivity data, and current
    workload distribution.
    """
    snapshot = _gather_project_snapshot(db, ctx.organization.id, project_id)

    prompt = f"""You are a construction resource allocation AI. Analyse the project and recommend optimal resource distribution.

PROJECT DATA:
{json.dumps(snapshot, indent=2, default=str)}

Respond with valid JSON in this exact structure:
{{
  "allocation_summary": {{
    "project_phase": "<current phase based on progress>",
    "resource_efficiency_score": <number 1-100>,
    "overall_recommendation": "<brief summary>"
  }},
  "labour_allocation": {{
    "current_assessment": "<assessment of current labour utilisation>",
    "recommendations": [
      {{
        "task_area": "<area>",
        "current_workers": "<estimate based on data>",
        "recommended_workers": "<recommendation>",
        "priority": "<High|Medium|Low>",
        "rationale": "<reason>"
      }}
    ]
  }},
  "materials_allocation": {{
    "current_assessment": "<assessment of material procurement>",
    "recommendations": [
      {{
        "material_type": "<type>",
        "status": "<Adequate|Running Low|Critical>",
        "action": "<recommended action>",
        "priority": "<High|Medium|Low>"
      }}
    ]
  }},
  "equipment_allocation": {{
    "current_assessment": "<assessment>",
    "recommendations": [
      {{
        "equipment_type": "<type>",
        "current_utilisation": "<assessment>",
        "recommendation": "<action>",
        "priority": "<High|Medium|Low>"
      }}
    ]
  }},
  "workload_distribution": {{
    "assessment": "<are tasks evenly distributed?>",
    "bottlenecks": ["<bottleneck 1>"],
    "rebalancing_suggestions": ["<suggestion 1>"]
  }},
  "upcoming_resource_needs": [
    {{
      "timeframe": "<next 2 weeks / next month>",
      "resource_type": "<Labour|Materials|Equipment>",
      "description": "<what is needed>",
      "priority": "<High|Medium|Low>"
    }}
  ],
  "cost_optimisation_tips": ["<tip 1>", "<tip 2>"]
}}

Base recommendations on the project's current phase (derived from progress percentage),
task statuses, BOQ items, expense categories, and upcoming milestones.
Focus on practical construction resource management for East African markets."""

    result = _call_gemini_json(prompt)
    return result
