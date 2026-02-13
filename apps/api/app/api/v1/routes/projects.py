from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import Optional, List
from uuid import UUID
from datetime import date
import math

from app.db.session import get_db
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectListResponse,
    ProjectMemberAdd,
    ProjectMemberResponse
)
from app.models.project import Project, ProjectMember, ProjectStatus, ProjectPriority
from app.models.user import User
from app.models.organization import Organization
from app.api.v1.dependencies import get_current_active_user, get_current_organization, get_org_context, OrgContext

router = APIRouter()


@router.get("", response_model=ProjectListResponse)
async def list_projects(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    manager_id: Optional[UUID] = Query(None),
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """List projects with pagination and filters"""
    query = db.query(Project).filter(
        Project.organization_id == ctx.organization.id,
        Project.is_deleted == False
    )
    
    # Apply filters
    if status:
        query = query.filter(Project.status == status)
    
    if priority:
        query = query.filter(Project.priority == priority)
    
    if manager_id:
        query = query.filter(Project.manager_id == manager_id)
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Project.project_name.ilike(search_filter),
                Project.description.ilike(search_filter),
                Project.location.ilike(search_filter)
            )
        )
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * page_size
    projects = query.order_by(Project.created_at.desc()).offset(offset).limit(page_size).all()
    
    # Build response
    items = []
    for project in projects:
        manager_name = f"{project.manager.first_name} {project.manager.last_name}" if project.manager else None
        items.append(ProjectResponse(
            id=project.id,
            organization_id=project.organization_id,
            project_name=project.project_name,
            description=project.description,
            status=project.status.value,
            priority=project.priority.value,
            manager_id=project.manager_id,
            manager_name=manager_name,
            start_date=project.start_date,
            end_date=project.end_date,
            total_budget=project.total_budget,
            location=project.location,
            client_name=project.client_name,
            contract_type=project.contract_type,
            parent_project_id=project.parent_project_id,
            created_by=project.created_by,
            created_at=project.created_at,
            updated_at=project.updated_at
        ))
    
    total_pages = math.ceil(total / page_size) if total > 0 else 0
    
    return ProjectListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Create a new project"""
    # Verify manager exists and is in the organization
    manager = db.query(User).filter(User.id == project_data.manager_id).first()
    if not manager:
        raise HTTPException(status_code=404, detail="Manager not found")
    
    # Create project
    project = Project(
        organization_id=ctx.organization.id,
        project_name=project_data.project_name,
        description=project_data.description,
        status=ProjectStatus(project_data.status),
        priority=ProjectPriority(project_data.priority),
        manager_id=project_data.manager_id,
        start_date=project_data.start_date,
        end_date=project_data.end_date,
        total_budget=project_data.total_budget,
        location=project_data.location,
        client_name=project_data.client_name,
        contract_type=project_data.contract_type,
        parent_project_id=project_data.parent_project_id,
        created_by=ctx.user.id
    )
    
    db.add(project)
    db.commit()
    db.refresh(project)
    
    # Add manager as project member
    project_member = ProjectMember(
        project_id=project.id,
        user_id=project_data.manager_id,
        role_in_project="Project Manager",
        joined_at=date.today()
    )
    db.add(project_member)
    db.commit()
    
    manager_name = f"{manager.first_name} {manager.last_name}"
    
    return ProjectResponse(
        id=project.id,
        organization_id=project.organization_id,
        project_name=project.project_name,
        description=project.description,
        status=project.status.value,
        priority=project.priority.value,
        manager_id=project.manager_id,
        manager_name=manager_name,
        start_date=project.start_date,
        end_date=project.end_date,
        total_budget=project.total_budget,
        location=project.location,
        client_name=project.client_name,
        contract_type=project.contract_type,
        parent_project_id=project.parent_project_id,
        created_by=project.created_by,
        created_at=project.created_at,
        updated_at=project.updated_at
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Get project by ID"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == ctx.organization.id,
        Project.is_deleted == False
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    manager_name = f"{project.manager.first_name} {project.manager.last_name}" if project.manager else None
    
    return ProjectResponse(
        id=project.id,
        organization_id=project.organization_id,
        project_name=project.project_name,
        description=project.description,
        status=project.status.value,
        priority=project.priority.value,
        manager_id=project.manager_id,
        manager_name=manager_name,
        start_date=project.start_date,
        end_date=project.end_date,
        total_budget=project.total_budget,
        location=project.location,
        client_name=project.client_name,
        contract_type=project.contract_type,
        parent_project_id=project.parent_project_id,
        created_by=project.created_by,
        created_at=project.created_at,
        updated_at=project.updated_at
    )


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    project_data: ProjectUpdate,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Update project"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == ctx.organization.id,
        Project.is_deleted == False
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Update fields
    update_data = project_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field in ["status", "priority"] and value:
            # Convert string to enum
            if field == "status":
                value = ProjectStatus(value)
            elif field == "priority":
                value = ProjectPriority(value)
        setattr(project, field, value)
    
    db.commit()
    db.refresh(project)
    
    manager_name = f"{project.manager.first_name} {project.manager.last_name}" if project.manager else None
    
    return ProjectResponse(
        id=project.id,
        organization_id=project.organization_id,
        project_name=project.project_name,
        description=project.description,
        status=project.status.value,
        priority=project.priority.value,
        manager_id=project.manager_id,
        manager_name=manager_name,
        start_date=project.start_date,
        end_date=project.end_date,
        total_budget=project.total_budget,
        location=project.location,
        client_name=project.client_name,
        contract_type=project.contract_type,
        parent_project_id=project.parent_project_id,
        created_by=project.created_by,
        created_at=project.created_at,
        updated_at=project.updated_at
    )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Soft delete project"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == ctx.organization.id,
        Project.is_deleted == False
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    from datetime import datetime
    project.is_deleted = True
    project.deleted_at = datetime.utcnow()
    
    db.commit()
    
    return None


@router.get("/{project_id}/members", response_model=List[ProjectMemberResponse])
async def get_project_members(
    project_id: UUID,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Get project members"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == ctx.organization.id,
        Project.is_deleted == False
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    members = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id
    ).all()
    
    result = []
    for member in members:
        user = member.user
        result.append(ProjectMemberResponse(
            id=member.id,
            user_id=member.user_id,
            user_name=f"{user.first_name} {user.last_name}",
            user_email=user.email,
            role_in_project=member.role_in_project,
            joined_at=member.joined_at
        ))
    
    return result


@router.post("/{project_id}/members", status_code=status.HTTP_201_CREATED)
async def add_project_member(
    project_id: UUID,
    member_data: ProjectMemberAdd,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Add member to project"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == ctx.organization.id,
        Project.is_deleted == False
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if already a member
    existing = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == member_data.user_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="User is already a project member")
    
    member = ProjectMember(
        project_id=project_id,
        user_id=member_data.user_id,
        role_in_project=member_data.role_in_project,
        joined_at=date.today()
    )
    
    db.add(member)
    db.commit()
    
    return {"message": "Member added successfully"}


@router.delete("/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_project_member(
    project_id: UUID,
    user_id: UUID,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Remove member from project"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == ctx.organization.id,
        Project.is_deleted == False
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    db.delete(member)
    db.commit()
    
    return None
