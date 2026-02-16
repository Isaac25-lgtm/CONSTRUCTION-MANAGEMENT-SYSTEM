from fastapi import APIRouter, Depends, Response, Request, status, Cookie
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
from uuid import UUID

from app.db.session import get_db
from app.schemas.auth import LoginRequest, LoginResponse, UserResponse, TokenResponse, LogoutResponse, OrganizationMembershipResponse
from app.models.user import User
from app.models.organization import OrganizationMember, MembershipStatus
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token, verify_token_type
from app.core.errors import InvalidCredentialsError, InvalidTokenError
from app.core.config import settings
from app.api.v1.dependencies import get_current_active_user

router = APIRouter()


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
    # Find user
    user = db.query(User).filter(
        User.email == credentials.email,
        User.is_active == True,
        User.is_deleted == False
    ).first()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise InvalidCredentialsError()
    
    # Get user's organization memberships
    org_memberships = db.query(OrganizationMember).filter(
        OrganizationMember.user_id == user.id
    ).all()
    
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
        path="/"
    )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
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
            org_role=membership.org_role.value,
            status=membership.status.value
        ))
    
    user_response = UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role.role_name.value if user.role else None,
        phone_number=user.phone_number,
        is_active=user.is_active,
        last_login=user.last_login,
        organizations=organizations
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        active_organization_id=active_organization_id,
        user=user_response
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: Request,
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
        
        user_id = payload.get("sub")
        if not user_id:
            raise InvalidTokenError()

        try:
            user_id = UUID(str(user_id))
        except (TypeError, ValueError):
            raise InvalidTokenError("Invalid refresh token subject")
        
        # Verify user still exists and is active
        user = db.query(User).filter(
            User.id == user_id,
            User.is_active == True,
            User.is_deleted == False
        ).first()
        
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
        
    except Exception as e:
        # Clear invalid refresh token
        response.delete_cookie(key="refresh_token", path="/")
        raise InvalidTokenError("Invalid or expired refresh token")


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get current user information including organization memberships.
    """
    # Get user's organization memberships
    org_memberships = db.query(OrganizationMember).filter(
        OrganizationMember.user_id == current_user.id
    ).all()
    
    # Build organization memberships response
    organizations = []
    for membership in org_memberships:
        organizations.append(OrganizationMembershipResponse(
            organization_id=membership.organization_id,
            organization_name=membership.organization.name,
            organization_slug=membership.organization.slug,
            org_role=membership.org_role.value,
            status=membership.status.value
        ))
    
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        role=current_user.role.role_name.value if current_user.role else None,
        phone_number=current_user.phone_number,
        is_active=current_user.is_active,
        last_login=current_user.last_login,
        organizations=organizations
    )


@router.post("/logout", response_model=LogoutResponse)
async def logout(response: Response):
    """Logout and clear refresh token cookie"""
    response.delete_cookie(key="refresh_token", path="/")
    return LogoutResponse(message="Logged out successfully")

