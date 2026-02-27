from fastapi import Depends, Header
from sqlalchemy.orm import Session
from typing import Optional

from app.api.v1.dependencies import get_current_active_user, get_current_user
from app.db.session import get_db
from app.models.user import User
from app.core.errors import PermissionDeniedError
from app.core.rbac import Permission, has_permission


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
