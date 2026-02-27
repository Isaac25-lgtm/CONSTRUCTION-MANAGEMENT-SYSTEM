from pydantic import BaseModel, UUID4, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


# Risk Schemas
class RiskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: str  # Technical, Financial, Schedule, Resource, External
    probability: str  # Very_Low, Low, Medium, High, Very_High
    impact: str  # Very_Low, Low, Medium, High, Very_High
    mitigation_plan: Optional[str] = None
    contingency_plan: Optional[str] = None
    owner_id: Optional[UUID4] = None


class RiskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = None
    probability: Optional[str] = None
    impact: Optional[str] = None
    status: Optional[str] = None  # Open, Monitoring, Mitigated, Closed
    mitigation_plan: Optional[str] = None
    contingency_plan: Optional[str] = None
    owner_id: Optional[UUID4] = None


class RiskResponse(BaseModel):
    id: UUID4
    organization_id: UUID4
    project_id: UUID4
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    probability: str
    impact: str
    risk_score: Optional[int] = None
    status: str
    mitigation_plan: Optional[str] = None
    contingency_plan: Optional[str] = None
    owner_id: Optional[UUID4] = None
    owner_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class RiskListResponse(BaseModel):
    items: List[RiskResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
