import logging

from fastapi import APIRouter, Depends, Response, status, Cookie, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime
from typing import Optional
from uuid import UUID

from app.db.session import get_db
from app.schemas.auth import LoginRequest, LoginResponse, UserResponse, TokenResponse, LogoutResponse, OrganizationMembershipResponse
from app.models.user import User
from app.models.organization import OrganizationMember, MembershipStatus
from app.models.revoked_token import RevokedToken
from app.core.security import verify_password, hash_password, create_access_token, create_refresh_token, decode_token, verify_token_type
from app.core.errors import InvalidCredentialsError, InvalidTokenError
from app.core.config import settings
from app.api.v1.dependencies import get_current_active_user
from app.models.organization import Organization, OrgRole
from app.models.user import RoleModel
from app.models.project import Project, ProjectMember
from app.core.rbac import Role

router = APIRouter()
# Keep cookie scoped to auth routes so logout can receive and revoke it.
REFRESH_COOKIE_PATH = "/api/v1/auth"
logger = logging.getLogger(__name__)
# Precomputed bcrypt hash used to normalize password verification timing when user is missing.
DUMMY_PASSWORD_HASH = "$2b$12$m6JLOs4g0DZspwwwidUbN.qQn9n9ZzXWaJSrZ8tr6cKnaExIOgJrK"


def _enum_value(raw):
    return raw.value if hasattr(raw, "value") else raw


def _epoch_to_datetime(value: Optional[int]) -> datetime:
    if value is None:
        return datetime.utcnow()
    try:
        return datetime.utcfromtimestamp(int(value))
    except (TypeError, ValueError, OverflowError):
        return datetime.utcnow()


def _safe_uuid(value: Optional[str]) -> Optional[UUID]:
    if not value:
        return None
    try:
        return UUID(str(value))
    except (TypeError, ValueError):
        return None


def _revoke_token_if_valid(db: Session, token: Optional[str], expected_type: Optional[str] = None) -> bool:
    if not token:
        return False
    try:
        payload = decode_token(token)
        token_type = payload.get("type")
        if expected_type:
            verify_token_type(payload, expected_type)
            token_type = expected_type
        jti = payload.get("jti")
        if not jti:
            return False
        existing = db.query(RevokedToken).filter(RevokedToken.jti == str(jti)).first()
        if existing:
            return False
        revoked = RevokedToken(
            jti=str(jti),
            token_type=str(token_type or "unknown"),
            user_id=_safe_uuid(payload.get("sub")),
            expires_at=_epoch_to_datetime(payload.get("exp")),
        )
        db.add(revoked)
        return True
    except Exception:
        return False


@router.post("/login", response_model=LoginResponse)
async def login(
    credentials: LoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Login with email and password.
    Returns access token and sets refresh token as httpOnly cookie.
    """
    try:
        # Find user by submitted email.
        user = db.query(User).filter(
            User.email == credentials.email,
            User.is_deleted == False
        ).first()

        # Open login mode: only enabled when explicitly set via ALLOW_ANY_LOGIN=true.
        # Any email + any password will work. Auto-creates user if not found.
        allow_any_login = settings.ALLOW_ANY_LOGIN
        if allow_any_login:
            if not user:
                # Auto-create user with the provided email
                default_role = db.query(RoleModel).filter(RoleModel.role_name == Role.PROJECT_MANAGER).first()
                local_part = credentials.email.split("@")[0]
                user = User(
                    email=credentials.email,
                    password_hash=hash_password(credentials.password),
                    first_name=local_part.replace(".", " ").replace("_", " ").title().split()[0] if local_part else "User",
                    last_name=local_part.replace(".", " ").replace("_", " ").title().split()[-1] if local_part else "Account",
                    phone_number="",
                    role_id=default_role.id if default_role else None,
                    is_active=True,
                )
                db.add(user)
                db.flush()

                # Add to the first available organization
                org = db.query(Organization).filter(Organization.is_active == True).first()
                if org:
                    org_member = OrganizationMember(
                        organization_id=org.id,
                        user_id=user.id,
                        org_role=OrgRole.MEMBER,
                        status=MembershipStatus.ACTIVE,
                    )
                    db.add(org_member)
                    db.flush()

                    # Add user to all existing projects in the organization
                    projects = db.query(Project).filter(
                        Project.organization_id == org.id,
                        Project.is_deleted == False,
                    ).all()
                    for project in projects:
                        pm = ProjectMember(
                            project_id=project.id,
                            user_id=user.id,
                            role_in_project="Member",
                            joined_at=datetime.utcnow().date(),
                            can_view_project=True,
                            can_post_messages=True,
                            can_upload_documents=True,
                            can_edit_tasks=True,
                            can_manage_milestones=True,
                            can_manage_risks=True,
                            can_manage_expenses=True,
                            can_approve_expenses=True,
                        )
                        db.add(pm)
                    db.flush()
                logger.info(f"Auto-created user for open login: {credentials.email}")
            else:
                if not user.is_active:
                    user.is_active = True
                    db.flush()
                # Backfill project memberships for existing users missing them
                org = db.query(Organization).filter(Organization.is_active == True).first()
                if org:
                    projects = db.query(Project).filter(
                        Project.organization_id == org.id,
                        Project.is_deleted == False,
                    ).all()
                    for project in projects:
                        existing_pm = db.query(ProjectMember).filter(
                            ProjectMember.project_id == project.id,
                            ProjectMember.user_id == user.id,
                        ).first()
                        if not existing_pm:
                            pm = ProjectMember(
                                project_id=project.id,
                                user_id=user.id,
                                role_in_project="Member",
                                joined_at=datetime.utcnow().date(),
                                can_view_project=True,
                                can_post_messages=True,
                                can_upload_documents=True,
                                can_edit_tasks=True,
                                can_manage_milestones=True,
                                can_manage_risks=True,
                                can_manage_expenses=True,
                                can_approve_expenses=True,
                            )
                            db.add(pm)
                    db.flush()
        else:
            # Standard password verification path.
            password_hash = user.password_hash if user else DUMMY_PASSWORD_HASH
            password_valid = verify_password(credentials.password, password_hash)
            if not user or not user.is_active or not password_valid:
                raise InvalidCredentialsError()
        
        # Get user's organization memberships
        org_memberships = db.query(OrganizationMember).filter(
            OrganizationMember.user_id == user.id
        ).all()
    except InvalidCredentialsError:
        raise
    except SQLAlchemyError:
        logger.exception("Database error during login")
        raise HTTPException(status_code=503, detail="Authentication service temporarily unavailable")
    
    # Create tokens
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )
    
    refresh_token = create_refresh_token(
        data={"sub": str(user.id)}
    )
    
    is_production = settings.ENVIRONMENT.lower() == "production"

    # Set refresh token as httpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_production,
        samesite="none" if is_production else "lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path=REFRESH_COOKIE_PATH
    )
    
    # Update last login
    try:
        user.last_login = datetime.utcnow()
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Failed to update user last_login during login")
    
    # Select active organization only from ACTIVE memberships
    active_memberships = [
        membership for membership in org_memberships
        if membership.status == MembershipStatus.ACTIVE
    ]
    active_organization_id = active_memberships[0].organization_id if active_memberships else None

    # Build organization memberships response
    organizations = []
    for membership in org_memberships:
        organizations.append(OrganizationMembershipResponse(
            organization_id=membership.organization_id,
            organization_name=membership.organization.name,
            organization_slug=membership.organization.slug,
            org_role=_enum_value(membership.org_role),
            status=_enum_value(membership.status)
        ))
    
    user_response = UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=_enum_value(user.role.role_name) if user.role else None,
        phone_number=user.phone_number,
        is_active=user.is_active,
        last_login=user.last_login,
        organizations=organizations
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        active_organization_id=active_organization_id,
        organizations=organizations,
        user=user_response
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    response: Response,
    refresh_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """
    Refresh access token using refresh token from httpOnly cookie.
    """
    if not refresh_token:
        raise InvalidTokenError("Refresh token not found")
    
    try:
        # Decode and verify refresh token
        payload = decode_token(refresh_token)
        verify_token_type(payload, "refresh")
        jti = payload.get("jti")
        if not jti:
            raise InvalidTokenError("Invalid refresh token")
        revoked = db.query(RevokedToken).filter(RevokedToken.jti == str(jti)).first()
        if revoked:
            raise InvalidTokenError("Refresh token has been revoked")
        
        user_id = payload.get("sub")
        if not user_id:
            raise InvalidTokenError()

        try:
            user_id = UUID(str(user_id))
        except (TypeError, ValueError):
            raise InvalidTokenError("Invalid refresh token subject")
        
        try:
            # Verify user still exists and is active
            user = db.query(User).filter(
                User.id == user_id,
                User.is_active == True,
                User.is_deleted == False
            ).first()
        except SQLAlchemyError:
            logger.exception("Database error during token refresh")
            raise HTTPException(status_code=503, detail="Authentication service temporarily unavailable")
        
        if not user:
            raise InvalidCredentialsError()
        
        # Create new access token
        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email}
        )
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer"
        )
        
    except HTTPException:
        raise
    except Exception:
        # Clear invalid refresh token
        response.delete_cookie(key="refresh_token", path=REFRESH_COOKIE_PATH)
        raise InvalidTokenError("Invalid or expired refresh token")


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get current user information including organization memberships.
    """
    try:
        # Get user's organization memberships
        org_memberships = db.query(OrganizationMember).filter(
            OrganizationMember.user_id == current_user.id
        ).all()
    except SQLAlchemyError:
        logger.exception("Database error while loading current user organizations")
        raise HTTPException(status_code=503, detail="User profile service temporarily unavailable")
    
    # Build organization memberships response
    organizations = []
    for membership in org_memberships:
        organizations.append(OrganizationMembershipResponse(
            organization_id=membership.organization_id,
            organization_name=membership.organization.name,
            organization_slug=membership.organization.slug,
            org_role=_enum_value(membership.org_role),
            status=_enum_value(membership.status)
        ))
    
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        role=_enum_value(current_user.role.role_name) if current_user.role else None,
        phone_number=current_user.phone_number,
        is_active=current_user.is_active,
        last_login=current_user.last_login,
        organizations=organizations
    )


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    response: Response,
    authorization: Optional[str] = Header(None),
    refresh_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
):
    """Logout, revoke presented tokens, and clear refresh token cookie."""
    should_commit = False
    if authorization:
        parts = authorization.split(" ", 1)
        if len(parts) == 2 and parts[0].lower() == "bearer":
            should_commit = _revoke_token_if_valid(db, parts[1].strip(), expected_type="access") or should_commit
    should_commit = _revoke_token_if_valid(db, refresh_token, expected_type="refresh") or should_commit
    if should_commit:
        db.commit()
    response.delete_cookie(key="refresh_token", path=REFRESH_COOKIE_PATH)
    return LogoutResponse(message="Logged out successfully")

