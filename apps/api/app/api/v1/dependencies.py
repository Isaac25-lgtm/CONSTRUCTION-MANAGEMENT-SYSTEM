from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from app.db.session import get_db
from app.models.user import User
from app.models.organization import Organization, OrganizationMember, MembershipStatus
from app.models.project import Project
from app.core.security import decode_token
from app.core.errors import UnauthorizedError, ForbiddenError


async def get_current_user(
    authorization: str = Header(...),
    db: Session = Depends(get_db)
) -> User:
    """Get current user from JWT token"""
    try:
        # Extract token from "Bearer <token>"
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise UnauthorizedError("Invalid authentication scheme")
        
        # Decode token
        payload = decode_token(token)
        user_id = payload.get("sub")
        
        if not user_id:
            raise UnauthorizedError("Invalid token payload")
        
        # Get user from database
        user = db.query(User).filter(
            User.id == user_id,
            User.is_deleted == False
        ).first()
        
        if not user:
            raise UnauthorizedError("User not found")
        
        return user
        
    except ValueError:
        raise UnauthorizedError("Invalid authorization header")
    except Exception as e:
        raise UnauthorizedError(str(e))


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Ensure user is active"""
    if not current_user.is_active:
        raise ForbiddenError("User account is inactive")
    return current_user


async def get_current_organization(
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Organization:
    """
    Get current organization from header.
    Verifies user is a member of the organization.
    """
    if not x_organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Organization-ID header is required"
        )
    
    try:
        org_id = UUID(x_organization_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid organization ID format"
        )
    
    # Check if user is member of this organization
    membership = db.query(OrganizationMember).filter(
        OrganizationMember.organization_id == org_id,
        OrganizationMember.user_id == current_user.id,
        OrganizationMember.status == MembershipStatus.ACTIVE
    ).first()
    
    if not membership:
        raise ForbiddenError("You are not a member of this organization")
    
    # Get organization
    organization = db.query(Organization).filter(
        Organization.id == org_id,
        Organization.is_active == True,
        Organization.is_deleted == False
    ).first()
    
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    return organization


async def get_project_with_access(
    project_id: UUID,
    organization: Organization = Depends(get_current_organization),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Project:
    """
    Get project and verify user has access.
    Ensures project belongs to current organization.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == organization.id,
        Project.is_deleted == False
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied"
        )
    
    # TODO: Add more granular project-level permissions check if needed
    # For now, any org member can access any project in their org
    
    return project


class OrgContext:
    """Context object containing current user and organization"""
    def __init__(self, user: User, organization: Organization):
        self.user = user
        self.organization = organization


async def get_org_context(
    user: User = Depends(get_current_active_user),
    organization: Organization = Depends(get_current_organization)
) -> OrgContext:
    """Get combined user + organization context"""
    return OrgContext(user=user, organization=organization)
