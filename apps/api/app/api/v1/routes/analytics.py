from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID
from datetime import date

from app.db.session import get_db
from app.schemas.analytics import DashboardKPIs, ProjectSummary
from app.models.project import Project
from app.models.project import ProjectStatus
from app.models.task import Task, TaskStatus
from app.models.expense import Expense, ExpenseStatus
from app.models.risk import Risk, RiskStatus, RiskImpact
from app.models.milestone import Milestone, MilestoneStatus
from app.models.organization import OrganizationMember, MembershipStatus
from app.api.v1.dependencies import get_org_context, OrgContext

router = APIRouter()


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
    
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == ctx.organization.id,
        Project.is_deleted == False
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
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
