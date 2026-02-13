from pydantic import BaseModel, UUID4, Field
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal


# Expense Schemas
class ExpenseCreate(BaseModel):
    description: str = Field(..., min_length=1, max_length=255)
    category: str  # Materials, Labor, Equipment, Services
    amount: Decimal = Field(..., gt=0)
    vendor: Optional[str] = None
    expense_date: date
    receipt_document_id: Optional[UUID4] = None
    notes: Optional[str] = None


class ExpenseUpdate(BaseModel):
    description: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = None
    amount: Optional[Decimal] = Field(None, gt=0)
    vendor: Optional[str] = None
    expense_date: Optional[date] = None
    receipt_document_id: Optional[UUID4] = None
    notes: Optional[str] = None


class ExpenseApprove(BaseModel):
    notes: Optional[str] = None


class ExpenseReject(BaseModel):
    notes: str = Field(..., min_length=1)


class ExpenseResponse(BaseModel):
    id: UUID4
    organization_id: UUID4
    project_id: UUID4
    description: str
    category: str
    amount: Decimal
    vendor: Optional[str] = None
    expense_date: date
    status: str  # Pending, Approved, Rejected, Paid
    logged_by_id: Optional[UUID4] = None
    logged_by_name: Optional[str] = None
    approved_by_id: Optional[UUID4] = None
    approved_by_name: Optional[str] = None
    receipt_document_id: Optional[UUID4] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ExpenseListResponse(BaseModel):
    items: List[ExpenseResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
