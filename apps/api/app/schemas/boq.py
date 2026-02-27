from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import UUID4, BaseModel, Field


class BOQItemResponse(BaseModel):
    id: UUID4
    header_id: UUID4
    organization_id: UUID4
    project_id: UUID4
    parent_item_id: Optional[UUID4] = None
    item_code: Optional[str] = None
    description: str
    unit: Optional[str] = None
    quantity: Decimal
    rate: Decimal
    budget_cost: Decimal
    weight_out_of_10: int
    percent_complete: int
    actual_cost: Decimal
    variance: Decimal
    created_at: datetime
    updated_at: datetime
    children: list["BOQItemResponse"] = []

    class Config:
        from_attributes = True


class BOQHeaderResponse(BaseModel):
    id: UUID4
    organization_id: UUID4
    project_id: UUID4
    title: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    currency: str
    created_at: datetime
    updated_at: datetime
    items: list[BOQItemResponse]


class BOQItemUpdate(BaseModel):
    item_code: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    quantity: Optional[Decimal] = Field(default=None, ge=0)
    rate: Optional[Decimal] = Field(default=None, ge=0)
    weight_out_of_10: Optional[int] = Field(default=None, ge=0, le=10)
    percent_complete: Optional[int] = Field(default=None, ge=0, le=100)
    actual_cost: Optional[Decimal] = Field(default=None, ge=0)
    parent_item_id: Optional[UUID4] = None


class BOQHeaderCreate(BaseModel):
    title: str = "Project BOQ"
    currency: str = "UGX"
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class BOQItemCreate(BaseModel):
    item_code: Optional[str] = None
    description: str
    unit: Optional[str] = None
    quantity: Decimal = Field(default=Decimal("0"), ge=0)
    rate: Decimal = Field(default=Decimal("0"), ge=0)
    weight_out_of_10: int = Field(default=1, ge=0, le=10)
    percent_complete: int = Field(default=0, ge=0, le=100)
    actual_cost: Decimal = Field(default=Decimal("0"), ge=0)
    parent_item_id: Optional[UUID4] = None


class BOQSummaryResponse(BaseModel):
    header_id: UUID4
    project_id: UUID4
    total_items: int
    total_budget_cost: Decimal
    total_actual_cost: Decimal
    total_variance: Decimal
    project_weighted_completion_percent: float


BOQItemResponse.model_rebuild()
