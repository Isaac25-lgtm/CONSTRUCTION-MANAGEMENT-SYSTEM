from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from uuid import UUID
from datetime import date
import math

from app.db.session import get_db
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseUpdate,
    ExpenseResponse,
    ExpenseListResponse,
    ExpenseApprove,
    ExpenseReject
)
from app.models.expense import Expense, ExpenseStatus
from app.models.project import Project
from app.api.v1.dependencies import get_org_context, OrgContext

router = APIRouter()


@router.get("", response_model=ExpenseListResponse)
async def list_expenses(
    project_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """List expenses for a project with pagination and filters"""
    # Verify project exists and belongs to org
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == ctx.organization.id,
        Project.is_deleted == False
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    query = db.query(Expense).filter(
        Expense.project_id == project_id,
        Expense.organization_id == ctx.organization.id,
        Expense.is_deleted == False
    )
    
    # Apply filters
    if status:
        query = query.filter(Expense.status == status)
    
    if category:
        query = query.filter(Expense.category == category)
    
    if from_date:
        query = query.filter(Expense.expense_date >= from_date)
    
    if to_date:
        query = query.filter(Expense.expense_date <= to_date)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * page_size
    expenses = query.order_by(Expense.expense_date.desc()).offset(offset).limit(page_size).all()
    
    # Build response
    items = []
    for expense in expenses:
        logged_by_name = f"{expense.logged_by.first_name} {expense.logged_by.last_name}" if expense.logged_by else None
        approved_by_name = f"{expense.approved_by.first_name} {expense.approved_by.last_name}" if expense.approved_by else None
        
        items.append(ExpenseResponse(
            id=expense.id,
            organization_id=expense.organization_id,
            project_id=expense.project_id,
            description=expense.description,
            category=expense.category,
            amount=expense.amount,
            vendor=expense.vendor,
            expense_date=expense.expense_date,
            status=expense.status.value,
            logged_by_id=expense.logged_by_id,
            logged_by_name=logged_by_name,
            approved_by_id=expense.approved_by_id,
            approved_by_name=approved_by_name,
            receipt_document_id=expense.receipt_document_id,
            notes=expense.notes,
            created_at=expense.created_at,
            updated_at=expense.updated_at
        ))
    
    total_pages = math.ceil(total / page_size) if total > 0 else 0
    
    return ExpenseListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    project_id: UUID,
    expense_data: ExpenseCreate,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Create a new expense"""
    # Verify project exists and belongs to org
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == ctx.organization.id,
        Project.is_deleted == False
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Create expense
    expense = Expense(
        organization_id=ctx.organization.id,
        project_id=project_id,
        description=expense_data.description,
        category=expense_data.category,
        amount=expense_data.amount,
        vendor=expense_data.vendor,
        expense_date=expense_data.expense_date,
        status=ExpenseStatus.PENDING,
        logged_by_id=ctx.user.id,
        receipt_document_id=expense_data.receipt_document_id,
        notes=expense_data.notes
    )
    
    db.add(expense)
    db.commit()
    db.refresh(expense)
    
    logged_by_name = f"{ctx.user.first_name} {ctx.user.last_name}"
    
    return ExpenseResponse(
        id=expense.id,
        organization_id=expense.organization_id,
        project_id=expense.project_id,
        description=expense.description,
        category=expense.category,
        amount=expense.amount,
        vendor=expense.vendor,
        expense_date=expense.expense_date,
        status=expense.status.value,
        logged_by_id=expense.logged_by_id,
        logged_by_name=logged_by_name,
        approved_by_id=expense.approved_by_id,
        approved_by_name=None,
        receipt_document_id=expense.receipt_document_id,
        notes=expense.notes,
        created_at=expense.created_at,
        updated_at=expense.updated_at
    )


@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    project_id: UUID,
    expense_id: UUID,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Get expense by ID"""
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.project_id == project_id,
        Expense.organization_id == ctx.organization.id,
        Expense.is_deleted == False
    ).first()
    
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    logged_by_name = f"{expense.logged_by.first_name} {expense.logged_by.last_name}" if expense.logged_by else None
    approved_by_name = f"{expense.approved_by.first_name} {expense.approved_by.last_name}" if expense.approved_by else None
    
    return ExpenseResponse(
        id=expense.id,
        organization_id=expense.organization_id,
        project_id=expense.project_id,
        description=expense.description,
        category=expense.category,
        amount=expense.amount,
        vendor=expense.vendor,
        expense_date=expense.expense_date,
        status=expense.status.value,
        logged_by_id=expense.logged_by_id,
        logged_by_name=logged_by_name,
        approved_by_id=expense.approved_by_id,
        approved_by_name=approved_by_name,
        receipt_document_id=expense.receipt_document_id,
        notes=expense.notes,
        created_at=expense.created_at,
        updated_at=expense.updated_at
    )


@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    project_id: UUID,
    expense_id: UUID,
    expense_data: ExpenseUpdate,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Update expense"""
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.project_id == project_id,
        Expense.organization_id == ctx.organization.id,
        Expense.is_deleted == False
    ).first()
    
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    # Only allow updates if pending
    if expense.status != ExpenseStatus.PENDING:
        raise HTTPException(status_code=400, detail="Can only update pending expenses")
    
    # Update fields
    update_data = expense_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(expense, field, value)
    
    db.commit()
    db.refresh(expense)
    
    logged_by_name = f"{expense.logged_by.first_name} {expense.logged_by.last_name}" if expense.logged_by else None
    approved_by_name = f"{expense.approved_by.first_name} {expense.approved_by.last_name}" if expense.approved_by else None
    
    return ExpenseResponse(
        id=expense.id,
        organization_id=expense.organization_id,
        project_id=expense.project_id,
        description=expense.description,
        category=expense.category,
        amount=expense.amount,
        vendor=expense.vendor,
        expense_date=expense.expense_date,
        status=expense.status.value,
        logged_by_id=expense.logged_by_id,
        logged_by_name=logged_by_name,
        approved_by_id=expense.approved_by_id,
        approved_by_name=approved_by_name,
        receipt_document_id=expense.receipt_document_id,
        notes=expense.notes,
        created_at=expense.created_at,
        updated_at=expense.updated_at
    )


@router.patch("/{expense_id}/approve", response_model=ExpenseResponse)
async def approve_expense(
    project_id: UUID,
    expense_id: UUID,
    approve_data: ExpenseApprove,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Approve expense"""
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.project_id == project_id,
        Expense.organization_id == ctx.organization.id,
        Expense.is_deleted == False
    ).first()
    
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    if expense.status != ExpenseStatus.PENDING:
        raise HTTPException(status_code=400, detail="Can only approve pending expenses")
    
    expense.status = ExpenseStatus.APPROVED
    expense.approved_by_id = ctx.user.id
    if approve_data.notes:
        expense.notes = f"{expense.notes or ''}\nApproval notes: {approve_data.notes}"
    
    db.commit()
    db.refresh(expense)
    
    logged_by_name = f"{expense.logged_by.first_name} {expense.logged_by.last_name}" if expense.logged_by else None
    approved_by_name = f"{ctx.user.first_name} {ctx.user.last_name}"
    
    return ExpenseResponse(
        id=expense.id,
        organization_id=expense.organization_id,
        project_id=expense.project_id,
        description=expense.description,
        category=expense.category,
        amount=expense.amount,
        vendor=expense.vendor,
        expense_date=expense.expense_date,
        status=expense.status.value,
        logged_by_id=expense.logged_by_id,
        logged_by_name=logged_by_name,
        approved_by_id=expense.approved_by_id,
        approved_by_name=approved_by_name,
        receipt_document_id=expense.receipt_document_id,
        notes=expense.notes,
        created_at=expense.created_at,
        updated_at=expense.updated_at
    )


@router.patch("/{expense_id}/reject", response_model=ExpenseResponse)
async def reject_expense(
    project_id: UUID,
    expense_id: UUID,
    reject_data: ExpenseReject,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Reject expense"""
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.project_id == project_id,
        Expense.organization_id == ctx.organization.id,
        Expense.is_deleted == False
    ).first()
    
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    if expense.status != ExpenseStatus.PENDING:
        raise HTTPException(status_code=400, detail="Can only reject pending expenses")
    
    expense.status = ExpenseStatus.REJECTED
    expense.approved_by_id = ctx.user.id
    expense.notes = f"{expense.notes or ''}\nRejection reason: {reject_data.notes}"
    
    db.commit()
    db.refresh(expense)
    
    logged_by_name = f"{expense.logged_by.first_name} {expense.logged_by.last_name}" if expense.logged_by else None
    approved_by_name = f"{ctx.user.first_name} {ctx.user.last_name}"
    
    return ExpenseResponse(
        id=expense.id,
        organization_id=expense.organization_id,
        project_id=expense.project_id,
        description=expense.description,
        category=expense.category,
        amount=expense.amount,
        vendor=expense.vendor,
        expense_date=expense.expense_date,
        status=expense.status.value,
        logged_by_id=expense.logged_by_id,
        logged_by_name=logged_by_name,
        approved_by_id=expense.approved_by_id,
        approved_by_name=approved_by_name,
        receipt_document_id=expense.receipt_document_id,
        notes=expense.notes,
        created_at=expense.created_at,
        updated_at=expense.updated_at
    )


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    project_id: UUID,
    expense_id: UUID,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Soft delete expense"""
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.project_id == project_id,
        Expense.organization_id == ctx.organization.id,
        Expense.is_deleted == False
    ).first()
    
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    from datetime import datetime
    expense.is_deleted = True
    expense.deleted_at = datetime.utcnow()
    
    db.commit()
    
    return None
