"""Phase 1 AI features -- narrative, report draft, copilot.

All features:
- Use deterministic data as the foundation
- AI adds narrative/summary, never replaces calculations
- Permission-aware (only uses data the user can already see)
- Logged via AIRequestLog
"""
import logging
import time

from ..models import AIRequestLog
from .context import assemble_project_context
from .provider import generate_text

logger = logging.getLogger("buildpro.ai")


def generate_narrative(project, user, *, async_job=None, user_perms=None):
    """Feature 1: Cost and Schedule Narrative.

    Uses deterministic schedule/cost/EVM data to produce a concise
    management narrative suitable for project status meetings.
    """
    context = assemble_project_context(
        project,
        user_perms=user_perms,
        include_schedule=True,
        include_cost=True,
        include_risks=True,
    )

    system_prompt = (
        "You are a construction project management assistant for BuildPro, "
        "a construction operations platform in Uganda. "
        "Generate a concise, professional project status narrative (3-5 paragraphs) "
        "suitable for a management status meeting. "
        "Use the deterministic data provided. Do not invent numbers. "
        "Focus on schedule progress, cost performance, key risks, and recommended actions. "
        "Use UGX as currency. Be direct and professional."
    )

    prompt = f"Generate a project status narrative based on this data:\n\n{context}"

    log = AIRequestLog.objects.create(
        user=user,
        project=project,
        async_job=async_job,
        feature="narrative",
        request_summary=f"Narrative for {project.code}",
        context_token_estimate=len(context) // 4,
    )

    try:
        result = generate_text(prompt, system_prompt=system_prompt, max_tokens=1500)
        log.status = "completed"
        log.provider = result["provider"]
        log.model_id = result["model"]
        log.response_summary = result["text"][:200]
        log.response_length = len(result["text"])
        log.duration_ms = result["duration_ms"]
        log.save()
        return {"text": result["text"], "log_id": str(log.id)}
    except Exception as e:
        log.status = "failed"
        log.response_summary = str(e)[:500]
        log.save()
        raise


def generate_report_draft(project, user, report_key, *, async_job=None):
    """Feature 2: Automated Report Drafting.

    Takes structured report data and produces a written summary
    suitable for inclusion in formal project reports.
    """
    from apps.reports.services import REPORT_ASSEMBLERS

    if report_key not in REPORT_ASSEMBLERS:
        raise ValueError(f"Unknown report key: {report_key}")

    assembler = REPORT_ASSEMBLERS[report_key]
    data = assembler(project)

    # Build a summary of the data for the AI
    rows = data.get("rows", [])
    columns = data.get("columns", data.get("headers", []))
    rows_summary = f"{len(rows)} rows of {report_key} data"
    if isinstance(columns, list):
        columns_str = ", ".join(str(c) for c in columns)
    else:
        columns_str = str(columns)
    sample_rows = rows[:5]
    sample_text = "\n".join(
        " | ".join(str(v) for v in row.values()) if isinstance(row, dict) else str(row)
        for row in sample_rows
    )

    system_prompt = (
        "You are a construction project management assistant. "
        "Generate a professional written report summary (2-4 paragraphs) "
        "based on the structured data provided. "
        "This will be included in a formal project report. "
        "Be factual, concise, and professional. Use UGX as currency where applicable."
    )

    prompt = (
        f"Project: {project.name} ({project.code})\n"
        f"Report type: {report_key}\n"
        f"Columns: {columns_str}\n"
        f"Data: {rows_summary}\n"
        f"Sample:\n{sample_text}\n\n"
        f"Write a professional summary of this {report_key} report data."
    )

    log = AIRequestLog.objects.create(
        user=user,
        project=project,
        async_job=async_job,
        feature="report_draft",
        request_summary=f"Report draft for {project.code} - {report_key}",
        context_token_estimate=len(prompt) // 4,
    )

    try:
        result = generate_text(prompt, system_prompt=system_prompt, max_tokens=1200)
        log.status = "completed"
        log.provider = result["provider"]
        log.model_id = result["model"]
        log.response_summary = result["text"][:200]
        log.response_length = len(result["text"])
        log.duration_ms = result["duration_ms"]
        log.save()
        return {"text": result["text"], "log_id": str(log.id)}
    except Exception as e:
        log.status = "failed"
        log.response_summary = str(e)[:500]
        log.save()
        raise


def answer_copilot_query(project, user, question, *, async_job=None, user_perms=None):
    """Feature 3: Narrow Project Copilot.

    Answers scoped questions about the project using structured data
    the user already has access to. Does not promise RAG or document search.
    """
    context = assemble_project_context(
        project,
        user_perms=user_perms,
        include_schedule=True,
        include_cost=True,
        include_risks=True,
        include_field_ops=True,
    )

    system_prompt = (
        "You are a construction project copilot for BuildPro. "
        "Answer the user's question using ONLY the project data provided below. "
        "If the data does not contain enough information to answer, say so clearly. "
        "Do not make up numbers or speculate beyond the data. "
        "Be concise and professional. Use UGX as currency."
    )

    prompt = f"Project data:\n{context}\n\nUser question: {question}"

    log = AIRequestLog.objects.create(
        user=user,
        project=project,
        async_job=async_job,
        feature="copilot",
        request_summary=f"Copilot: {question[:100]}",
        context_token_estimate=len(prompt) // 4,
    )

    try:
        result = generate_text(prompt, system_prompt=system_prompt, max_tokens=1000)
        log.status = "completed"
        log.provider = result["provider"]
        log.model_id = result["model"]
        log.response_summary = result["text"][:200]
        log.response_length = len(result["text"])
        log.duration_ms = result["duration_ms"]
        log.save()
        return {"text": result["text"], "log_id": str(log.id)}
    except Exception as e:
        log.status = "failed"
        log.response_summary = str(e)[:500]
        log.save()
        raise
