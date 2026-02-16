from pydantic import BaseModel, UUID4
from typing import Optional, List, Any
from datetime import datetime


# Audit Log Schemas
class AuditLogResponse(BaseModel):
    id: UUID4
    organization_id: UUID4
    user_id: Optional[UUID4] = None
    user_name: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[UUID4] = None
    before_state: Optional[Any] = None
    after_state: Optional[Any] = None
    details: Optional[Any] = None
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    items: List[AuditLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# Analytics Schemas
class DashboardKPIs(BaseModel):
    total_projects: int = 0
    active_projects: int = 0
    total_tasks: int = 0
    completed_tasks: int = 0
    overdue_tasks: int = 0
    total_budget: float = 0
    total_spent: float = 0
    budget_utilization: float = 0
    open_risks: int = 0
    high_risks: int = 0
    upcoming_milestones: int = 0
    overdue_milestones: int = 0
    team_members: int = 0


class ProjectSummary(BaseModel):
    project_id: UUID4
    project_name: str
    status: str
    progress: float
    task_count: int
    completed_tasks: int
    budget: float
    spent: float
    risk_count: int
    high_risks: int
