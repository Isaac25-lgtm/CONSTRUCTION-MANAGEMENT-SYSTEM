from datetime import date, datetime
from typing import List, Optional

from pydantic import AliasChoices, BaseModel, Field, UUID4


class MilestoneCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    target_date: date = Field(
        ...,
        validation_alias=AliasChoices("target_date", "due_date"),
    )
    dependencies: List[UUID4] = Field(default_factory=list)


class MilestoneUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    target_date: Optional[date] = Field(
        None,
        validation_alias=AliasChoices("target_date", "due_date"),
    )
    status: Optional[str] = None
    actual_date: Optional[date] = Field(
        None,
        validation_alias=AliasChoices("actual_date", "completion_date"),
    )
    completion_percentage: Optional[int] = Field(None, ge=0, le=100)
    dependencies: Optional[List[UUID4]] = None


class MilestoneResponse(BaseModel):
    id: UUID4
    organization_id: UUID4
    project_id: UUID4
    name: str
    description: Optional[str] = None
    target_date: date
    actual_date: Optional[date] = None
    status: str
    completion_percentage: int
    dependencies: List[UUID4] = Field(default_factory=list)
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
