from pydantic import BaseModel, UUID4, Field
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal


# Project Schemas
class ProjectCreate(BaseModel):
    project_name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    status: str = "Planning"  # Planning, In_Progress, On_Hold, Completed, Cancelled
    priority: str = "Medium"  # Low, Medium, High, Critical
    manager_id: UUID4
    start_date: date
    end_date: date
    total_budget: Decimal = Field(..., ge=0)
    location: Optional[str] = None
    client_name: Optional[str] = None
    contract_type: Optional[str] = None
    parent_project_id: Optional[UUID4] = None


class ProjectUpdate(BaseModel):
    project_name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    manager_id: Optional[UUID4] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    total_budget: Optional[Decimal] = Field(None, ge=0)
    location: Optional[str] = None
    client_name: Optional[str] = None
    contract_type: Optional[str] = None


class ProjectMemberResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    user_name: str
    user_email: str
    role_in_project: Optional[str] = None
    joined_at: date
    can_view_project: bool = True
    can_post_messages: bool = True
    can_upload_documents: bool = True
    can_edit_tasks: bool = True
    can_manage_milestones: bool = True
    can_manage_risks: bool = True
    can_manage_expenses: bool = True
    can_approve_expenses: bool = True
    
    class Config:
        from_attributes = True


class ProjectResponse(BaseModel):
    id: UUID4
    organization_id: UUID4
    project_name: str
    description: Optional[str] = None
    status: str
    priority: str
    manager_id: UUID4
    manager_name: Optional[str] = None
    start_date: date
    end_date: date
    total_budget: Decimal
    location: Optional[str] = None
    client_name: Optional[str] = None
    contract_type: Optional[str] = None
    parent_project_id: Optional[UUID4] = None
    created_by: UUID4
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ProjectListResponse(BaseModel):
    items: List[ProjectResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ProjectMemberAdd(BaseModel):
    user_id: UUID4
    role_in_project: Optional[str] = None
    can_view_project: bool = True
    can_post_messages: bool = True
    can_upload_documents: bool = True
    can_edit_tasks: bool = True
    can_manage_milestones: bool = True
    can_manage_risks: bool = True
    can_manage_expenses: bool = True
    can_approve_expenses: bool = True


class ProjectMemberPermissionUpdate(BaseModel):
    role_in_project: Optional[str] = None
    can_view_project: Optional[bool] = None
    can_post_messages: Optional[bool] = None
    can_upload_documents: Optional[bool] = None
    can_edit_tasks: Optional[bool] = None
    can_manage_milestones: Optional[bool] = None
    can_manage_risks: Optional[bool] = None
    can_manage_expenses: Optional[bool] = None
    can_approve_expenses: Optional[bool] = None
