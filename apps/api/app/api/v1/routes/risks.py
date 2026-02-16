from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
import math

from app.db.session import get_db
from app.schemas.risk import RiskCreate, RiskUpdate, RiskResponse, RiskListResponse
from app.models.risk import Risk, RiskProbability, RiskImpact, RiskStatus
from app.models.project import Project
from app.models.organization import OrganizationMember, MembershipStatus
from app.models.user import User
from app.api.v1.dependencies import get_org_context, OrgContext

router = APIRouter()


def _is_active_org_member(db: Session, org_id: UUID, user_id: UUID | None) -> bool:
    if not user_id:
        return True
    membership = (
        db.query(OrganizationMember)
        .join(User, User.id == OrganizationMember.user_id)
        .filter(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user_id,
            OrganizationMember.status == MembershipStatus.ACTIVE,
            User.is_active == True,
            User.is_deleted == False,
        )
        .first()
    )
    return membership is not None


def calculate_risk_score(probability: RiskProbability, impact: RiskImpact) -> int:
    """Calculate risk score from probability and impact"""
    prob_values = {"Very_Low": 1, "Low": 2, "Medium": 3, "High": 4, "Very_High": 5}
    impact_values = {"Very_Low": 1, "Low": 2, "Medium": 3, "High": 4, "Very_High": 5}
    
    return prob_values.get(probability.value, 3) * impact_values.get(impact.value, 3)


@router.get("", response_model=RiskListResponse)
async def list_risks(
    project_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """List risks for a project"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == ctx.organization.id,
        Project.is_deleted == False
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    query = db.query(Risk).filter(
        Risk.project_id == project_id,
        Risk.organization_id == ctx.organization.id,
        Risk.is_deleted == False
    )
    
    if status:
        query = query.filter(Risk.status == status)
    
    if category:
        query = query.filter(Risk.category == category)
    
    total = query.count()
    offset = (page - 1) * page_size
    risks = query.order_by(Risk.risk_score.desc()).offset(offset).limit(page_size).all()
    
    items = []
    for risk in risks:
        owner_name = f"{risk.owner.first_name} {risk.owner.last_name}" if risk.owner else None
        items.append(RiskResponse(
            id=risk.id,
            organization_id=risk.organization_id,
            project_id=risk.project_id,
            title=risk.title,
            description=risk.description,
            category=risk.category,
            probability=risk.probability.value,
            impact=risk.impact.value,
            risk_score=risk.risk_score,
            status=risk.status.value,
            mitigation_plan=risk.mitigation_plan,
            contingency_plan=risk.contingency_plan,
            owner_id=risk.owner_id,
            owner_name=owner_name,
            created_at=risk.created_at,
            updated_at=risk.updated_at
        ))
    
    total_pages = math.ceil(total / page_size) if total > 0 else 0
    
    return RiskListResponse(items=items, total=total, page=page, page_size=page_size, total_pages=total_pages)


@router.post("", response_model=RiskResponse, status_code=status.HTTP_201_CREATED)
async def create_risk(
    project_id: UUID,
    risk_data: RiskCreate,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Create a new risk"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == ctx.organization.id,
        Project.is_deleted == False
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not _is_active_org_member(db, ctx.organization.id, risk_data.owner_id):
        raise HTTPException(status_code=400, detail="Owner must be an active member of this organization")
    
    probability = RiskProbability(risk_data.probability)
    impact = RiskImpact(risk_data.impact)
    risk_score = calculate_risk_score(probability, impact)
    
    risk = Risk(
        organization_id=ctx.organization.id,
        project_id=project_id,
        title=risk_data.title,
        description=risk_data.description or risk_data.title,
        category=risk_data.category,
        probability=probability,
        impact=impact,
        risk_score=risk_score,
        status=RiskStatus.OPEN,
        mitigation_plan=risk_data.mitigation_plan,
        contingency_plan=risk_data.contingency_plan,
        owner_id=risk_data.owner_id
    )
    
    db.add(risk)
    db.commit()
    db.refresh(risk)
    
    owner_name = f"{risk.owner.first_name} {risk.owner.last_name}" if risk.owner else None
    
    return RiskResponse(
        id=risk.id,
        organization_id=risk.organization_id,
        project_id=risk.project_id,
        title=risk.title,
        description=risk.description,
        category=risk.category,
        probability=risk.probability.value,
        impact=risk.impact.value,
        risk_score=risk.risk_score,
        status=risk.status.value,
        mitigation_plan=risk.mitigation_plan,
        contingency_plan=risk.contingency_plan,
        owner_id=risk.owner_id,
        owner_name=owner_name,
        created_at=risk.created_at,
        updated_at=risk.updated_at
    )


@router.put("/{risk_id}", response_model=RiskResponse)
async def update_risk(
    project_id: UUID,
    risk_id: UUID,
    risk_data: RiskUpdate,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Update risk"""
    risk = db.query(Risk).filter(
        Risk.id == risk_id,
        Risk.project_id == project_id,
        Risk.organization_id == ctx.organization.id,
        Risk.is_deleted == False
    ).first()
    
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")
    if "owner_id" in risk_data.model_dump(exclude_unset=True):
        if not _is_active_org_member(db, ctx.organization.id, risk_data.owner_id):
            raise HTTPException(status_code=400, detail="Owner must be an active member of this organization")
    
    update_data = risk_data.dict(exclude_unset=True)
    if "description" in update_data and update_data["description"] is None:
        raise HTTPException(status_code=400, detail="description cannot be null")

    for field, value in update_data.items():
        if field == "probability" and value:
            risk.probability = RiskProbability(value)
        elif field == "impact" and value:
            risk.impact = RiskImpact(value)
        elif field == "status" and value:
            risk.status = RiskStatus(value)
        else:
            setattr(risk, field, value)
    
    # Recalculate risk score
    risk.risk_score = calculate_risk_score(risk.probability, risk.impact)
    
    db.commit()
    db.refresh(risk)
    
    owner_name = f"{risk.owner.first_name} {risk.owner.last_name}" if risk.owner else None
    
    return RiskResponse(
        id=risk.id,
        organization_id=risk.organization_id,
        project_id=risk.project_id,
        title=risk.title,
        description=risk.description,
        category=risk.category,
        probability=risk.probability.value,
        impact=risk.impact.value,
        risk_score=risk.risk_score,
        status=risk.status.value,
        mitigation_plan=risk.mitigation_plan,
        contingency_plan=risk.contingency_plan,
        owner_id=risk.owner_id,
        owner_name=owner_name,
        created_at=risk.created_at,
        updated_at=risk.updated_at
    )


@router.delete("/{risk_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_risk(
    project_id: UUID,
    risk_id: UUID,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Soft delete risk"""
    risk = db.query(Risk).filter(
        Risk.id == risk_id,
        Risk.project_id == project_id,
        Risk.organization_id == ctx.organization.id,
        Risk.is_deleted == False
    ).first()
    
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")
    
    from datetime import datetime
    risk.is_deleted = True
    risk.deleted_at = datetime.utcnow()
    
    db.commit()
    return None
