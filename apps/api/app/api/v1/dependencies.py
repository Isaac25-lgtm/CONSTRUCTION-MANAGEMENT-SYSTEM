from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from app.db.session import get_db
from app.models.user import User
from app.models.organization import Organization, OrganizationMember, MembershipStatus
from app.models.project import Project, ProjectMember
from app.core.security import decode_token, verify_token_type
from app.core.errors import UnauthorizedError, ForbiddenError
from app.core.config import settings


async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """Get current user from JWT token"""
    try:
        if not authorization:
            raise UnauthorizedError("Missing authorization header")

        # Extract token from "Bearer <token>"
        parts = authorization.split(" ", 1)
        if len(parts) != 2:
            raise UnauthorizedError("Invalid authorization header")
        scheme, token = parts[0], parts[1].strip()
        if scheme.lower() != "bearer" or not token:
            raise UnauthorizedError("Invalid authentication scheme")
        
        # Decode token
        payload = decode_token(token)
        verify_token_type(payload, "access")
        user_id = payload.get("sub")
        
        if not user_id:
            raise UnauthorizedError("Invalid token payload")

        try:
            user_id = UUID(str(user_id))
        except (TypeError, ValueError):
            raise UnauthorizedError("Invalid token subject")
        
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
    except UnauthorizedError:
        raise
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
        memberships = db.query(OrganizationMember).filter(
            OrganizationMember.user_id == current_user.id,
            OrganizationMember.status == MembershipStatus.ACTIVE
        ).all()

        if len(memberships) == 0:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No active organization membership found for this user"
            )

        if len(memberships) == 1:
            org_id = memberships[0].organization_id
        else:
            detail = "X-Organization-ID header is required when multiple organizations are available"
            if settings.ENVIRONMENT.lower() == "production":
                detail = "X-Organization-ID header is required in production when multiple organizations are available"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=detail
            )
    else:
        try:
            org_id = UUID(x_organization_id.strip())
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
    project = get_project_or_404(db, organization.id, project_id)
    ensure_project_member(db, project, current_user)
    return project


def get_project_or_404(db: Session, organization_id: UUID, project_id: UUID) -> Project:
    """Get project by id in the current organization or raise 404."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == organization_id,
        Project.is_deleted == False,
    ).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    return project


def get_project_membership(
    db: Session,
    project_id: UUID,
    user_id: UUID,
) -> Optional[ProjectMember]:
    """Return explicit project membership if present."""
    return db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id,
    ).first()


def is_project_owner_or_manager(project: Project, user: User) -> bool:
    """Project creators/managers are treated as implicit full-access members."""
    return project.manager_id == user.id or project.created_by == user.id


def ensure_project_member(
    db: Session,
    project: Project,
    user: User,
) -> Optional[ProjectMember]:
    """
    Ensure user is a project member.
    Returns explicit membership row when present, else None for implicit owner/manager access.
    """
    if is_project_owner_or_manager(project, user):
        return None

    membership = get_project_membership(db, project.id, user.id)
    if not membership:
        raise ForbiddenError("You are not a member of this project")
    return membership


def ensure_project_permission(
    db: Session,
    project: Project,
    user: User,
    permission_field: str,
    denied_message: str,
) -> Optional[ProjectMember]:
    """
    Ensure user has a specific project permission.
    Owners/managers always pass with implicit full access.
    """
    membership = ensure_project_member(db, project, user)
    if membership is None:
        return None

    if not bool(getattr(membership, permission_field, False)):
        raise ForbiddenError(denied_message)

    return membership


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
