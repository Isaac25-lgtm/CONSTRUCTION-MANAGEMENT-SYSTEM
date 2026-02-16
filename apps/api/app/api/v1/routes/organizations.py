from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID

from app.db.session import get_db
from app.schemas.organization import (
    OrganizationCreate, OrganizationUpdate, OrganizationResponse,
    OrganizationListResponse, OrganizationMemberResponse
)
from app.models.organization import (
    MembershipStatus,
    Organization,
    OrganizationMember,
    OrgRole,
    SubscriptionTier,
)
from app.models.user import User
from app.api.v1.dependencies import get_current_active_user

router = APIRouter()


def _to_organization_response(
    org: Organization,
    member_count: int | None = None,
) -> OrganizationResponse:
    subscription_tier = (
        org.subscription_tier.value
        if hasattr(org.subscription_tier, "value")
        else str(org.subscription_tier)
    )
    return OrganizationResponse(
        id=org.id,
        name=org.name,
        slug=org.slug,
        subscription_tier=subscription_tier,
        max_projects=org.max_projects,
        max_users=org.max_users,
        logo_url=org.logo_url,
        is_active=org.is_active,
        member_count=member_count,
        created_at=org.created_at,
        updated_at=org.updated_at,
    )


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

        items.append(_to_organization_response(org, member_count=member_count))
    
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
    )
    db.add(org)
    db.flush()
    
    # Add creator as org admin
    membership = OrganizationMember(
        organization_id=org.id,
        user_id=current_user.id,
        org_role=OrgRole.ORG_ADMIN,
        status=MembershipStatus.ACTIVE
    )
    db.add(membership)
    db.commit()
    db.refresh(org)

    return _to_organization_response(org, member_count=1)


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

    return _to_organization_response(org, member_count=member_count)


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
        OrganizationMember.org_role == OrgRole.ORG_ADMIN
    ).first()
    
    if not membership:
        raise HTTPException(status_code=403, detail="Only org admins can update organization")
    
    org = db.query(Organization).filter(
        Organization.id == org_id,
        Organization.is_deleted == False
    ).first()
    
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    update_data = org_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "subscription_tier" and value:
            try:
                value = SubscriptionTier(value.lower())
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid subscription_tier")
        setattr(org, field, value)
    
    db.commit()
    db.refresh(org)
    
    member_count = db.query(func.count(OrganizationMember.id)).filter(
        OrganizationMember.organization_id == org.id,
        OrganizationMember.status == MembershipStatus.ACTIVE
    ).scalar()

    return _to_organization_response(org, member_count=member_count)


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
                org_role=m.org_role.value,
                status=m.status.value,
                joined_at=m.created_at
            ))
    
    return result
