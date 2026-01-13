from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session
from datetime import timedelta

from app.db.session import get_db
from app.schemas.auth import LoginRequest, LoginResponse, UserResponse
from app.models.user import User
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.core.errors import InvalidCredentialsError
from app.core.config import settings

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
    
    # Create tokens
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )
    
    refresh_token = create_refresh_token(
        data={"sub": str(user.id)}
    )
    
    # Set refresh token as httpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )
    
    # Update last login
    from datetime import datetime
    user.last_login = datetime.utcnow()
    db.commit()
    
    return {
        "success": True,
        "data": {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role.role_name.value if user.role else None,
                "phone_number": user.phone_number
            }
        }
    }


@router.post("/logout")
async def logout(response: Response):
    """Logout and clear refresh token cookie"""
    response.delete_cookie("refresh_token")
    return {"success": True, "data": {"message": "Logged out successfully"}}
