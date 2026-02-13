from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from uuid import UUID
import math

from app.db.session import get_db
from app.schemas.organization import (
    OrganizationCreate, OrganizationUpdate, OrganizationResponse,
    OrganizationListResponse, OrganizationMemberResponse
)
from app.models.organization import Organization, OrganizationMember, MembershipStatus, OrgRole
from app.models.user import User
from app.api.v1.dependencies import get_current_active_user, get_current_organization

router = APIRouter()


@router.get("", response_model=OrganizationListResponse)
async def list_organizations(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List organizations the current user belongs to"""
    memberships = db.query(OrganizationMember).filter(
        OrganizationMember.user_id == current_user.id,
        OrganizationMember.status == MembershipStatus.ACTIVE
    ).all()
    
    org_ids = [m.organization_id for m in memberships]
    
    orgs = db.query(Organization).filter(
        Organization.id.in_(org_ids),
        Organization.is_active == True,
        Organization.is_deleted == False
    ).all()
    
    items = []
    for org in orgs:
        member_count = db.query(func.count(OrganizationMember.id)).filter(
            OrganizationMember.organization_id == org.id,
            OrganizationMember.status == MembershipStatus.ACTIVE
        ).scalar()
        
        items.append(OrganizationResponse(
            id=org.id,
            name=org.name,
            slug=org.slug,
            description=org.description,
            industry=org.industry,
            website=org.website,
            address=org.address,
            subscription_tier=org.subscription_tier,
            is_active=org.is_active,
            member_count=member_count,
            created_at=org.created_at,
            updated_at=org.updated_at
        ))
    
    return OrganizationListResponse(items=items, total=len(items))


@router.post("", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
async def create_organization(
    org_data: OrganizationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new organization"""
    # Check slug uniqueness
    existing = db.query(Organization).filter(Organization.slug == org_data.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="Organization slug already in use")
    
    org = Organization(
        name=org_data.name,
        slug=org_data.slug,
        description=org_data.description,
        industry=org_data.industry,
        website=org_data.website,
        address=org_data.address,
    )
    db.add(org)
    db.flush()
    
    # Add creator as org admin
    membership = OrganizationMember(
        organization_id=org.id,
        user_id=current_user.id,
        role=OrgRole.ORG_ADMIN,
        status=MembershipStatus.ACTIVE
    )
    db.add(membership)
    db.commit()
    db.refresh(org)
    
    return OrganizationResponse(
        id=org.id,
        name=org.name,
        slug=org.slug,
        description=org.description,
        industry=org.industry,
        website=org.website,
        address=org.address,
        subscription_tier=org.subscription_tier,
        is_active=org.is_active,
        member_count=1,
        created_at=org.created_at,
        updated_at=org.updated_at
    )


@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(
    org_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get organization details"""
    # Verify membership
    membership = db.query(OrganizationMember).filter(
        OrganizationMember.organization_id == org_id,
        OrganizationMember.user_id == current_user.id,
        OrganizationMember.status == MembershipStatus.ACTIVE
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this organization")
    
    org = db.query(Organization).filter(
        Organization.id == org_id,
        Organization.is_deleted == False
    ).first()
    
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    member_count = db.query(func.count(OrganizationMember.id)).filter(
        OrganizationMember.organization_id == org.id,
        OrganizationMember.status == MembershipStatus.ACTIVE
    ).scalar()
    
    return OrganizationResponse(
        id=org.id,
        name=org.name,
        slug=org.slug,
        description=org.description,
        industry=org.industry,
        website=org.website,
        address=org.address,
        subscription_tier=org.subscription_tier,
        is_active=org.is_active,
        member_count=member_count,
        created_at=org.created_at,
        updated_at=org.updated_at
    )


@router.put("/{org_id}", response_model=OrganizationResponse)
async def update_organization(
    org_id: UUID,
    org_data: OrganizationUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update organization (admin only)"""
    membership = db.query(OrganizationMember).filter(
        OrganizationMember.organization_id == org_id,
        OrganizationMember.user_id == current_user.id,
        OrganizationMember.status == MembershipStatus.ACTIVE,
        OrganizationMember.role == OrgRole.ORG_ADMIN
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Only org admins can update organization")
    
    org = db.query(Organization).filter(
        Organization.id == org_id,
        Organization.is_deleted == False
    ).first()
    
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    update_data = org_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(org, field, value)
    
    db.commit()
    db.refresh(org)
    
    member_count = db.query(func.count(OrganizationMember.id)).filter(
        OrganizationMember.organization_id == org.id,
        OrganizationMember.status == MembershipStatus.ACTIVE
    ).scalar()
    
    return OrganizationResponse(
        id=org.id,
        name=org.name,
        slug=org.slug,
        description=org.description,
        industry=org.industry,
        website=org.website,
        address=org.address,
        subscription_tier=org.subscription_tier,
        is_active=org.is_active,
        member_count=member_count,
        created_at=org.created_at,
        updated_at=org.updated_at
    )


@router.get("/{org_id}/members", response_model=list[OrganizationMemberResponse])
async def list_members(
    org_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List organization members"""
    # Verify membership
    membership = db.query(OrganizationMember).filter(
        OrganizationMember.organization_id == org_id,
        OrganizationMember.user_id == current_user.id,
        OrganizationMember.status == MembershipStatus.ACTIVE
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this organization")
    
    members = db.query(OrganizationMember).filter(
        OrganizationMember.organization_id == org_id,
        OrganizationMember.status == MembershipStatus.ACTIVE
    ).all()
    
    result = []
    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        if user:
            result.append(OrganizationMemberResponse(
                user_id=m.user_id,
                email=user.email,
                first_name=user.first_name,
                last_name=user.last_name,
                role=m.role.value,
                status=m.status.value,
                joined_at=m.created_at
            ))
    
    return result
