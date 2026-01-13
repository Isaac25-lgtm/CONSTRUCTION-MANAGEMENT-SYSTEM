from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.models.user import User
from app.core.security import decode_token, verify_token_type
from app.core.errors import AuthenticationError, PermissionDeniedError
from app.core.rbac import Permission, has_permission

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    token = credentials.credentials
    
    try:
        payload = decode_token(token)
        verify_token_type(payload, "access")
        user_id: str = payload.get("sub")
        
        if user_id is None:
            raise AuthenticationError("Invalid token payload")
        
    except Exception as e:
        raise AuthenticationError(str(e))
    
    user = db.query(User).filter(User.id == user_id, User.is_active == True, User.is_deleted == False).first()
    
    if user is None:
        raise AuthenticationError("User not found")
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Verify user is active"""
    if not current_user.is_active:
        raise AuthenticationError("User is inactive")
    return current_user


def require_permission(permission: Permission):
    """Dependency to require a specific permission"""
    async def permission_checker(
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
    ) -> User:
        # Get user's role permissions
        user_permissions = set(current_user.role.permissions) if current_user.role else set()
        
        if not has_permission(user_permissions, permission):
            raise PermissionDeniedError(
                f"Permission denied: {permission.value} required",
                details={"required_permission": permission.value}
            )
        
        return current_user
    
    return permission_checker


def get_request_id(x_request_id: Optional[str] = Header(None)) -> str:
    """Get or generate request ID for tracing"""
    import uuid
    return x_request_id or str(uuid.uuid4())
