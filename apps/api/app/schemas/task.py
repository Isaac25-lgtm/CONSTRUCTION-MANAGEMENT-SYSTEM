from pydantic import BaseModel, UUID4, Field
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal


# Task Schemas
class TaskCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    status: str = "Pending"  # Pending, In Progress, Completed, Blocked, Cancelled
    priority: str = "Medium"  # Low, Medium, High, Critical
    assignee_id: Optional[UUID4] = None
    reporter_id: Optional[UUID4] = None
    start_date: Optional[date] = None
    due_date: date
    estimated_hours: Optional[Decimal] = Field(None, ge=0)
    dependencies: List[UUID4] = []


class TaskUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee_id: Optional[UUID4] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    estimated_hours: Optional[Decimal] = Field(None, ge=0)
    actual_hours: Optional[Decimal] = Field(None, ge=0)
    progress: Optional[int] = Field(None, ge=0, le=100)
    dependencies: Optional[List[UUID4]] = None


class TaskStatusUpdate(BaseModel):
    status: str


class TaskProgressUpdate(BaseModel):
    progress: int = Field(..., ge=0, le=100)


class TaskResponse(BaseModel):
    id: UUID4
    organization_id: UUID4
    project_id: UUID4
    name: str
    description: Optional[str] = None
    status: str
    priority: str
    assignee_id: Optional[UUID4] = None
    assignee_name: Optional[str] = None
    reporter_id: Optional[UUID4] = None
    reporter_name: Optional[str] = None
    start_date: Optional[date] = None
    due_date: date
    estimated_hours: Optional[Decimal] = None
    actual_hours: Optional[Decimal] = None
    progress: int
    dependencies: List[UUID4] = []
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class TaskListResponse(BaseModel):
    items: List[TaskResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
