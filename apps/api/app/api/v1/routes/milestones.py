from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
import math

from app.db.session import get_db
from app.schemas.milestone import MilestoneCreate, MilestoneUpdate, MilestoneResponse, MilestoneListResponse
from app.models.milestone import Milestone, MilestoneStatus
from app.models.project import Project
from app.api.v1.dependencies import get_org_context, OrgContext

router = APIRouter()


@router.get("", response_model=MilestoneListResponse)
async def list_milestones(
    project_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """List milestones for a project"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == ctx.organization.id,
        Project.is_deleted == False
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    query = db.query(Milestone).filter(
        Milestone.project_id == project_id,
        Milestone.organization_id == ctx.organization.id,
        Milestone.is_deleted == False
    )
    
    if status:
        query = query.filter(Milestone.status == status)
    
    total = query.count()
    offset = (page - 1) * page_size
    milestones = query.order_by(Milestone.due_date.asc()).offset(offset).limit(page_size).all()
    
    items = [MilestoneResponse(
        id=m.id,
        organization_id=m.organization_id,
        project_id=m.project_id,
        name=m.name,
        description=m.description,
        due_date=m.due_date,
        status=m.status.value,
        completion_date=m.completion_date,
        dependencies=m.dependencies or [],
        created_at=m.created_at,
        updated_at=m.updated_at
    ) for m in milestones]
    
    total_pages = math.ceil(total / page_size) if total > 0 else 0
    
    return MilestoneListResponse(items=items, total=total, page=page, page_size=page_size, total_pages=total_pages)


@router.post("", response_model=MilestoneResponse, status_code=status.HTTP_201_CREATED)
async def create_milestone(
    project_id: UUID,
    milestone_data: MilestoneCreate,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Create a new milestone"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == ctx.organization.id,
        Project.is_deleted == False
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    milestone = Milestone(
        organization_id=ctx.organization.id,
        project_id=project_id,
        name=milestone_data.name,
        description=milestone_data.description,
        due_date=milestone_data.due_date,
        status=MilestoneStatus.PENDING,
        dependencies=milestone_data.dependencies
    )
    
    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    
    return MilestoneResponse(
        id=milestone.id,
        organization_id=milestone.organization_id,
        project_id=milestone.project_id,
        name=milestone.name,
        description=milestone.description,
        due_date=milestone.due_date,
        status=milestone.status.value,
        completion_date=milestone.completion_date,
        dependencies=milestone.dependencies or [],
        created_at=milestone.created_at,
        updated_at=milestone.updated_at
    )


@router.put("/{milestone_id}", response_model=MilestoneResponse)
async def update_milestone(
    project_id: UUID,
    milestone_id: UUID,
    milestone_data: MilestoneUpdate,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Update milestone"""
    milestone = db.query(Milestone).filter(
        Milestone.id == milestone_id,
        Milestone.project_id == project_id,
        Milestone.organization_id == ctx.organization.id,
        Milestone.is_deleted == False
    ).first()
    
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    update_data = milestone_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field == "status" and value:
            milestone.status = MilestoneStatus(value)
        else:
            setattr(milestone, field, value)
    
    db.commit()
    db.refresh(milestone)
    
    return MilestoneResponse(
        id=milestone.id,
        organization_id=milestone.organization_id,
        project_id=milestone.project_id,
        name=milestone.name,
        description=milestone.description,
        due_date=milestone.due_date,
        status=milestone.status.value,
        completion_date=milestone.completion_date,
        dependencies=milestone.dependencies or [],
        created_at=milestone.created_at,
        updated_at=milestone.updated_at
    )


@router.delete("/{milestone_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_milestone(
    project_id: UUID,
    milestone_id: UUID,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Soft delete milestone"""
    milestone = db.query(Milestone).filter(
        Milestone.id == milestone_id,
        Milestone.project_id == project_id,
        Milestone.organization_id == ctx.organization.id,
        Milestone.is_deleted == False
    ).first()
    
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    from datetime import datetime
    milestone.is_deleted = True
    milestone.deleted_at = datetime.utcnow()
    
    db.commit()
    return None
