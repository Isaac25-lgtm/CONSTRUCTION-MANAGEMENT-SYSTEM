from pydantic import BaseModel, UUID4, Field
from typing import Optional, List
from datetime import date, datetime


# Milestone Schemas
class MilestoneCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    due_date: date
    dependencies: List[UUID4] = []


class MilestoneUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    due_date: Optional[date] = None
    status: Optional[str] = None  # Pending, In_Progress, Completed, Delayed
    completion_date: Optional[date] = None
    dependencies: Optional[List[UUID4]] = None


class MilestoneResponse(BaseModel):
    id: UUID4
    organization_id: UUID4
    project_id: UUID4
    name: str
    description: Optional[str] = None
    due_date: date
    status: str
    completion_date: Optional[date] = None
    dependencies: List[UUID4] = []
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class MilestoneListResponse(BaseModel):
    items: List[MilestoneResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
