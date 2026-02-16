import csv
import io
from datetime import date, datetime
from typing import Literal

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID

from app.db.session import get_db
from app.schemas.analytics import DashboardKPIs, ProjectSummary
from app.models.project import Project
from app.models.project import ProjectStatus
from app.models.task import Task, TaskStatus
from app.models.expense import Expense, ExpenseStatus
from app.models.risk import Risk, RiskStatus, RiskImpact
from app.models.milestone import Milestone, MilestoneStatus
from app.models.organization import OrganizationMember, MembershipStatus
from app.api.v1.dependencies import (
    OrgContext,
    ensure_project_permission,
    get_org_context,
    get_project_or_404,
)

router = APIRouter()


def _escape_pdf_text(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _build_simple_pdf(lines: list[str]) -> bytes:
    safe_lines = [_escape_pdf_text(line) for line in lines if line is not None]
    if not safe_lines:
        safe_lines = ["BuildPro Report"]

    text_commands = ["BT", "/F1 10 Tf", "14 TL", "42 560 Td"]
    text_commands.append(f"({safe_lines[0]}) Tj")
    for line in safe_lines[1:]:
        text_commands.append("T*")
        text_commands.append(f"({line}) Tj")
    text_commands.append("ET")

    content = "\n".join(text_commands).encode("latin-1", errors="replace")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length "
        + str(len(content)).encode()
        + b" >>\nstream\n"
        + content
        + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]

    pdf = io.BytesIO()
    pdf.write(b"%PDF-1.4\n")
    offsets = [0]

    for index, obj in enumerate(objects, start=1):
        offsets.append(pdf.tell())
        pdf.write(f"{index} 0 obj\n".encode("ascii"))
        pdf.write(obj)
        pdf.write(b"\nendobj\n")

    xref_pos = pdf.tell()
    pdf.write(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    pdf.write(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.write(f"{offset:010d} 00000 n \n".encode("ascii"))
    pdf.write(
        (
            f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_pos}\n%%EOF"
        ).encode("ascii")
    )

    return pdf.getvalue()


@router.get("/dashboard", response_model=DashboardKPIs)
async def get_dashboard_kpis(
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Get dashboard KPIs for the current organization"""
    org_id = ctx.organization.id
    
    # Projects
    total_projects = db.query(func.count(Project.id)).filter(
        Project.organization_id == org_id, Project.is_deleted == False
    ).scalar() or 0
    
    active_projects = db.query(func.count(Project.id)).filter(
        Project.organization_id == org_id, Project.is_deleted == False,
        Project.status.in_([ProjectStatus.PLANNING, ProjectStatus.IN_PROGRESS])
    ).scalar() or 0
    
    # Tasks
    total_tasks = db.query(func.count(Task.id)).filter(
        Task.organization_id == org_id, Task.is_deleted == False
    ).scalar() or 0
    
    completed_tasks = db.query(func.count(Task.id)).filter(
        Task.organization_id == org_id, Task.is_deleted == False,
        Task.status == TaskStatus.COMPLETED
    ).scalar() or 0
    
    overdue_tasks = db.query(func.count(Task.id)).filter(
        Task.organization_id == org_id, Task.is_deleted == False,
        Task.due_date < date.today(),
        Task.status.notin_([TaskStatus.COMPLETED, TaskStatus.CANCELLED])
    ).scalar() or 0
    
    # Budget
    total_budget = db.query(func.sum(Project.total_budget)).filter(
        Project.organization_id == org_id, Project.is_deleted == False
    ).scalar() or 0
    
    total_spent = db.query(func.sum(Expense.amount)).filter(
        Expense.organization_id == org_id, Expense.is_deleted == False,
        Expense.status == ExpenseStatus.APPROVED
    ).scalar() or 0
    
    budget_utilization = (float(total_spent) / float(total_budget) * 100) if total_budget > 0 else 0
    
    # Risks
    open_risks = db.query(func.count(Risk.id)).filter(
        Risk.organization_id == org_id, Risk.is_deleted == False,
        Risk.status == RiskStatus.OPEN
    ).scalar() or 0
    
    high_risks = db.query(func.count(Risk.id)).filter(
        Risk.organization_id == org_id, Risk.is_deleted == False,
        Risk.impact.in_([RiskImpact.HIGH, RiskImpact.VERY_HIGH]),
        Risk.status == RiskStatus.OPEN
    ).scalar() or 0
    
    # Milestones
    upcoming_milestones = db.query(func.count(Milestone.id)).filter(
        Milestone.organization_id == org_id, Milestone.is_deleted == False,
        Milestone.target_date >= date.today(),
        Milestone.status != MilestoneStatus.COMPLETED
    ).scalar() or 0
    
    overdue_milestones = db.query(func.count(Milestone.id)).filter(
        Milestone.organization_id == org_id, Milestone.is_deleted == False,
        Milestone.target_date < date.today(),
        Milestone.status.notin_([MilestoneStatus.COMPLETED])
    ).scalar() or 0
    
    # Team
    team_members = db.query(func.count(OrganizationMember.id)).filter(
        OrganizationMember.organization_id == org_id,
        OrganizationMember.status == MembershipStatus.ACTIVE
    ).scalar() or 0
    
    return DashboardKPIs(
        total_projects=total_projects,
        active_projects=active_projects,
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        overdue_tasks=overdue_tasks,
        total_budget=float(total_budget),
        total_spent=float(total_spent),
        budget_utilization=round(budget_utilization, 1),
        open_risks=open_risks,
        high_risks=high_risks,
        upcoming_milestones=upcoming_milestones,
        overdue_milestones=overdue_milestones,
        team_members=team_members
    )


@router.get("/projects/{project_id}/summary", response_model=ProjectSummary)
async def get_project_summary(
    project_id: UUID,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Get summary for a specific project"""
    from fastapi import HTTPException
    
    project = get_project_or_404(db, ctx.organization.id, project_id)
    ensure_project_permission(
        db,
        project,
        ctx.user,
        "can_view_project",
        "You do not have permission to view analytics for this project",
    )
    
    task_count = db.query(func.count(Task.id)).filter(
        Task.project_id == project_id, Task.is_deleted == False
    ).scalar() or 0
    
    completed_tasks = db.query(func.count(Task.id)).filter(
        Task.project_id == project_id, Task.is_deleted == False,
        Task.status == TaskStatus.COMPLETED
    ).scalar() or 0
    
    spent = db.query(func.sum(Expense.amount)).filter(
        Expense.project_id == project_id, Expense.is_deleted == False,
        Expense.status == ExpenseStatus.APPROVED
    ).scalar() or 0
    
    risk_count = db.query(func.count(Risk.id)).filter(
        Risk.project_id == project_id, Risk.is_deleted == False,
        Risk.status == RiskStatus.OPEN
    ).scalar() or 0
    
    high_risks = db.query(func.count(Risk.id)).filter(
        Risk.project_id == project_id, Risk.is_deleted == False,
        Risk.impact.in_([RiskImpact.HIGH, RiskImpact.VERY_HIGH]),
        Risk.status == RiskStatus.OPEN
    ).scalar() or 0
    
    progress = (completed_tasks / task_count * 100) if task_count > 0 else 0
    
    return ProjectSummary(
        project_id=project.id,
        project_name=project.project_name,
        status=project.status.value,
        progress=round(progress, 1),
        task_count=task_count,
        completed_tasks=completed_tasks,
        budget=float(project.total_budget),
        spent=float(spent),
        risk_count=risk_count,
        high_risks=high_risks
    )


@router.get("/reports/export")
async def export_analytics_report(
    format: Literal["pdf", "excel"] = Query("pdf"),
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db),
):
    """Export organization analytics report as PDF or CSV."""
    org_id = ctx.organization.id
    kpis = await get_dashboard_kpis(ctx=ctx, db=db)

    projects = db.query(Project).filter(
        Project.organization_id == org_id,
        Project.is_deleted == False,
    ).order_by(Project.created_at.desc()).all()

    today_str = datetime.utcnow().strftime("%Y-%m-%d")

    if format == "excel":
        buffer = io.StringIO()
        writer = csv.writer(buffer)

        writer.writerow(["BuildPro Analytics Report"])
        writer.writerow(["Generated", datetime.utcnow().isoformat()])
        writer.writerow(["Organization", ctx.organization.name])
        writer.writerow([])
        writer.writerow(["KPI", "Value"])
        writer.writerow(["Total Projects", kpis.total_projects])
        writer.writerow(["Active Projects", kpis.active_projects])
        writer.writerow(["Total Tasks", kpis.total_tasks])
        writer.writerow(["Completed Tasks", kpis.completed_tasks])
        writer.writerow(["Overdue Tasks", kpis.overdue_tasks])
        writer.writerow(["Total Budget", kpis.total_budget])
        writer.writerow(["Total Spent", kpis.total_spent])
        writer.writerow(["Budget Utilization (%)", kpis.budget_utilization])
        writer.writerow(["Open Risks", kpis.open_risks])
        writer.writerow(["High Risks", kpis.high_risks])
        writer.writerow(["Upcoming Milestones", kpis.upcoming_milestones])
        writer.writerow(["Overdue Milestones", kpis.overdue_milestones])
        writer.writerow(["Team Members", kpis.team_members])
        writer.writerow([])
        writer.writerow(["Project", "Status", "Manager ID", "Budget", "Start Date", "End Date"])

        for project in projects:
            writer.writerow([
                project.project_name,
                project.status.value if hasattr(project.status, "value") else project.status,
                str(project.manager_id) if project.manager_id else "",
                float(project.total_budget) if project.total_budget is not None else 0,
                project.start_date.isoformat() if project.start_date else "",
                project.end_date.isoformat() if project.end_date else "",
            ])

        csv_bytes = buffer.getvalue().encode("utf-8")
        filename = f"buildpro-analytics-{today_str}.csv"
        return Response(
            content=csv_bytes,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    lines = [
        "BuildPro Analytics Report",
        f"Generated: {datetime.utcnow().isoformat()}",
        f"Organization: {ctx.organization.name}",
        "",
        f"Total Projects: {kpis.total_projects}",
        f"Active Projects: {kpis.active_projects}",
        f"Total Tasks: {kpis.total_tasks}",
        f"Completed Tasks: {kpis.completed_tasks}",
        f"Overdue Tasks: {kpis.overdue_tasks}",
        f"Total Budget: {kpis.total_budget}",
        f"Total Spent: {kpis.total_spent}",
        f"Budget Utilization (%): {kpis.budget_utilization}",
        f"Open Risks: {kpis.open_risks}",
        f"High Risks: {kpis.high_risks}",
        f"Upcoming Milestones: {kpis.upcoming_milestones}",
        f"Overdue Milestones: {kpis.overdue_milestones}",
        f"Team Members: {kpis.team_members}",
        "",
        "Projects:",
    ]

    for project in projects[:20]:
        status_value = project.status.value if hasattr(project.status, "value") else project.status
        lines.append(
            f"- {project.project_name} | {status_value} | Budget: "
            f"{float(project.total_budget) if project.total_budget is not None else 0}"
        )

    pdf_bytes = _build_simple_pdf(lines)
    filename = f"buildpro-analytics-{today_str}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/reports/project-summary/export")
async def export_project_summary_csv(
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db),
):
    """Export project summary report as CSV."""
    org_id = ctx.organization.id
    projects = (
        db.query(Project)
        .filter(
            Project.organization_id == org_id,
            Project.is_deleted == False,
        )
        .order_by(Project.created_at.desc())
        .all()
    )

    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["BuildPro Project Summary"])
    writer.writerow(["Generated", datetime.utcnow().isoformat()])
    writer.writerow(["Organization", ctx.organization.name])
    writer.writerow([])
    writer.writerow(
        [
            "Project",
            "Status",
            "Priority",
            "Manager ID",
            "Start Date",
            "End Date",
            "Budget",
            "Task Count",
            "Completed Tasks",
            "Progress (%)",
        ]
    )

    for project in projects:
        task_count = (
            db.query(func.count(Task.id))
            .filter(
                Task.organization_id == org_id,
                Task.project_id == project.id,
                Task.is_deleted == False,
            )
            .scalar()
            or 0
        )
        completed_tasks = (
            db.query(func.count(Task.id))
            .filter(
                Task.organization_id == org_id,
                Task.project_id == project.id,
                Task.is_deleted == False,
                Task.status == TaskStatus.COMPLETED,
            )
            .scalar()
            or 0
        )
        progress = (completed_tasks / task_count * 100) if task_count else 0

        writer.writerow(
            [
                project.project_name,
                project.status.value if hasattr(project.status, "value") else project.status,
                project.priority.value if hasattr(project.priority, "value") else project.priority,
                str(project.manager_id) if project.manager_id else "",
                project.start_date.isoformat() if project.start_date else "",
                project.end_date.isoformat() if project.end_date else "",
                float(project.total_budget) if project.total_budget is not None else 0,
                task_count,
                completed_tasks,
                round(progress, 2),
            ]
        )

    filename = f"buildpro-project-summary-{today_str}.csv"
    return Response(
        content=buffer.getvalue().encode("utf-8"),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/reports/financial-summary/export")
async def export_financial_summary_csv(
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db),
):
    """Export financial summary report as CSV."""
    org_id = ctx.organization.id
    projects = (
        db.query(Project)
        .filter(
            Project.organization_id == org_id,
            Project.is_deleted == False,
        )
        .order_by(Project.created_at.desc())
        .all()
    )
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["BuildPro Financial Summary"])
    writer.writerow(["Generated", datetime.utcnow().isoformat()])
    writer.writerow(["Organization", ctx.organization.name])
    writer.writerow([])
    writer.writerow(
        [
            "Project",
            "Budget",
            "Approved Spend",
            "Pending Spend",
            "Remaining Budget",
            "Budget Utilization (%)",
        ]
    )

    for project in projects:
        approved_spend = (
            db.query(func.sum(Expense.amount))
            .filter(
                Expense.organization_id == org_id,
                Expense.project_id == project.id,
                Expense.is_deleted == False,
                Expense.status == ExpenseStatus.APPROVED,
            )
            .scalar()
            or 0
        )
        pending_spend = (
            db.query(func.sum(Expense.amount))
            .filter(
                Expense.organization_id == org_id,
                Expense.project_id == project.id,
                Expense.is_deleted == False,
                Expense.status == ExpenseStatus.PENDING,
            )
            .scalar()
            or 0
        )
        budget = float(project.total_budget or 0)
        approved = float(approved_spend or 0)
        pending = float(pending_spend or 0)
        remaining = budget - approved
        utilization = (approved / budget * 100) if budget > 0 else 0

        writer.writerow(
            [
                project.project_name,
                round(budget, 2),
                round(approved, 2),
                round(pending, 2),
                round(remaining, 2),
                round(utilization, 2),
            ]
        )

    filename = f"buildpro-financial-summary-{today_str}.csv"
    return Response(
        content=buffer.getvalue().encode("utf-8"),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
