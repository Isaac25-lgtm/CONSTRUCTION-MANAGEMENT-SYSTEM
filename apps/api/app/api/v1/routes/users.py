from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_active_user, require_permission
from app.models.user import User
from app.core.rbac import Permission

router = APIRouter()


@router.get("/me")
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """Get current user profile"""
    return {
        "success": True,
        "data": {
            "id": str(current_user.id),
            "email": current_user.email,
            "first_name": current_user.first_name,
            "last_name": current_user.last_name,
            "full_name": current_user.full_name,
            "role": current_user.role.role_name.value if current_user.role else None,
            "permissions": current_user.role.permissions if current_user.role else [],
            "phone_number": current_user.phone_number,
            "last_login": current_user.last_login.isoformat() if current_user.last_login else None
        }
    }


@router.get("")
async def list_users(
    current_user: User = Depends(require_permission(Permission.USERS_MANAGE)),
    db: Session = Depends(get_db)
):
    """List all users (Admin only)"""
    users = db.query(User).filter(User.is_deleted == False).all()
    
    return {
        "success": True,
        "data": [
            {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role.role_name.value if user.role else None,
                "is_active": user.is_active
            }
            for user in users
        ]
    }
