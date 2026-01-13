from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.api.deps import get_current_active_user, require_permission
from app.models.user import User
from app.models.project import Project, ProjectMember
from app.core.rbac import Permission

router = APIRouter()


@router.get("")
async def list_projects(
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    List projects accessible to the current user.
    Admins see all, others see only assigned projects.
    """
    # Check if user has view all permission
    user_permissions = set(current_user.role.permissions) if current_user.role else set()
    can_view_all = Permission.PROJECTS_VIEW_ALL in user_permissions
    
    query = db.query(Project).filter(Project.is_deleted == False)
    
    if not can_view_all:
        # Filter to only projects where user is a member or manager
        query = query.join(ProjectMember).filter(
            (ProjectMember.user_id == current_user.id) | (Project.manager_id == current_user.id)
        )
    
    if status:
        query = query.filter(Project.status == status)
    
    projects = query.all()
    
    return {
        "success": True,
        "data": [
            {
                "id": str(project.id),
                "project_name": project.project_name,
                "description": project.description,
                "status": project.status.value,
                "priority": project.priority.value,
                "start_date": project.start_date.isoformat(),
                "end_date": project.end_date.isoformat(),
                "total_budget": float(project.total_budget),
                "location": project.location,
                "manager": {
                    "id": str(project.manager.id),
                    "name": project.manager.full_name
                } if project.manager else None
            }
            for project in projects
        ]
    }


@router.get("/{project_id}")
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get project details"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.is_deleted == False
    ).first()
    
    if not project:
        return {"success": False, "error": {"code": "NOT_FOUND", "message": "Project not found"}}
    
    # TODO: Add permission check for project access
    
    return {
        "success": True,
        "data": {
            "id": str(project.id),
            "project_name": project.project_name,
            "description": project.description,
            "status": project.status.value,
            "priority": project.priority.value,
            "start_date": project.start_date.isoformat(),
            "end_date": project.end_date.isoformat(),
            "total_budget": float(project.total_budget),
            "location": project.location,
            "manager": {
                "id": str(project.manager.id),
                "name": project.manager.full_name,
                "email": project.manager.email
            } if project.manager else None,
            "created_at": project.created_at.isoformat(),
            "child_projects_count": len(project.child_projects) if project.child_projects else 0
        }
    }
