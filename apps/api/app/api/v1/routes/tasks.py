from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from uuid import UUID
import math

from app.db.session import get_db
from app.schemas.task import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    TaskListResponse,
    TaskStatusUpdate,
    TaskProgressUpdate
)
from app.models.task import Task, TaskStatus, TaskPriority
from app.models.organization import OrganizationMember, MembershipStatus
from app.models.user import User
from app.services.notifications import create_notification
from app.api.v1.dependencies import (
    OrgContext,
    ensure_project_permission,
    get_org_context,
    get_project_or_404,
)

router = APIRouter()


def _is_active_org_member(db: Session, org_id: UUID, user_id: UUID | None) -> bool:
    if not user_id:
        return True
    membership = (
        db.query(OrganizationMember)
        .join(User, User.id == OrganizationMember.user_id)
        .filter(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user_id,
            OrganizationMember.status == MembershipStatus.ACTIVE,
            User.is_active == True,
            User.is_deleted == False,
        )
        .first()
    )
    return membership is not None


@router.get("", response_model=TaskListResponse)
async def list_tasks(
    project_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    assignee_id: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None),
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """List tasks for a project with pagination and filters"""
    # Verify project exists and belongs to org
    project = get_project_or_404(db, ctx.organization.id, project_id)
    ensure_project_permission(
        db,
        project,
        ctx.user,
        "can_view_project",
        "You do not have permission to view tasks in this project",
    )
    
    query = db.query(Task).filter(
        Task.project_id == project_id,
        Task.organization_id == ctx.organization.id,
        Task.is_deleted == False
    )
    
    # Apply filters
    if status:
        query = query.filter(Task.status == status)
    
    if priority:
        query = query.filter(Task.priority == priority)
    
    if assignee_id:
        query = query.filter(Task.assignee_id == assignee_id)
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Task.name.ilike(search_filter),
                Task.description.ilike(search_filter)
            )
        )
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * page_size
    tasks = query.order_by(Task.due_date.asc()).offset(offset).limit(page_size).all()
    
    # Build response
    items = []
    for task in tasks:
        assignee_name = f"{task.assignee.first_name} {task.assignee.last_name}" if task.assignee else None
        reporter_name = f"{task.reporter.first_name} {task.reporter.last_name}" if task.reporter else None
        
        items.append(TaskResponse(
            id=task.id,
            organization_id=task.organization_id,
            project_id=task.project_id,
            name=task.name,
            description=task.description,
            status=task.status.value,
            priority=task.priority.value,
            assignee_id=task.assignee_id,
            assignee_name=assignee_name,
            reporter_id=task.reporter_id,
            reporter_name=reporter_name,
            start_date=task.start_date,
            due_date=task.due_date,
            estimated_hours=task.estimated_hours,
            actual_hours=task.actual_hours,
            progress=task.progress,
            dependencies=task.dependencies or [],
            created_at=task.created_at,
            updated_at=task.updated_at
        ))
    
    total_pages = math.ceil(total / page_size) if total > 0 else 0
    
    return TaskListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    project_id: UUID,
    task_data: TaskCreate,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Create a new task"""
    # Verify project exists and belongs to org
    project = get_project_or_404(db, ctx.organization.id, project_id)
    ensure_project_permission(
        db,
        project,
        ctx.user,
        "can_edit_tasks",
        "You do not have permission to create tasks in this project",
    )

    if not _is_active_org_member(db, ctx.organization.id, task_data.assignee_id):
        raise HTTPException(status_code=400, detail="Assignee must be an active member of this organization")
    if not _is_active_org_member(db, ctx.organization.id, task_data.reporter_id):
        raise HTTPException(status_code=400, detail="Reporter must be an active member of this organization")
    
    # Create task
    task = Task(
        organization_id=ctx.organization.id,
        project_id=project_id,
        name=task_data.name,
        description=task_data.description,
        status=TaskStatus(task_data.status),
        priority=TaskPriority(task_data.priority),
        assignee_id=task_data.assignee_id,
        reporter_id=task_data.reporter_id or ctx.user.id,
        start_date=task_data.start_date,
        due_date=task_data.due_date,
        estimated_hours=task_data.estimated_hours,
        progress=0,
        dependencies=task_data.dependencies
    )
    
    db.add(task)
    db.commit()
    db.refresh(task)

    if task.assignee_id and task.assignee_id != ctx.user.id:
        create_notification(
            db,
            organization_id=ctx.organization.id,
            user_id=task.assignee_id,
            project_id=project_id,
            notification_type="task_assigned",
            title="Task assigned",
            body=f"You were assigned task '{task.name}'.",
            data={"task_id": str(task.id), "project_id": str(project_id)},
        )
        db.commit()
    
    assignee_name = f"{task.assignee.first_name} {task.assignee.last_name}" if task.assignee else None
    reporter_name = f"{task.reporter.first_name} {task.reporter.last_name}" if task.reporter else None
    
    return TaskResponse(
        id=task.id,
        organization_id=task.organization_id,
        project_id=task.project_id,
        name=task.name,
        description=task.description,
        status=task.status.value,
        priority=task.priority.value,
        assignee_id=task.assignee_id,
        assignee_name=assignee_name,
        reporter_id=task.reporter_id,
        reporter_name=reporter_name,
        start_date=task.start_date,
        due_date=task.due_date,
        estimated_hours=task.estimated_hours,
        actual_hours=task.actual_hours,
        progress=task.progress,
        dependencies=task.dependencies or [],
        created_at=task.created_at,
        updated_at=task.updated_at
    )


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    project_id: UUID,
    task_id: UUID,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Get task by ID"""
    project = get_project_or_404(db, ctx.organization.id, project_id)
    ensure_project_permission(
        db,
        project,
        ctx.user,
        "can_view_project",
        "You do not have permission to view tasks in this project",
    )

    task = db.query(Task).filter(
        Task.id == task_id,
        Task.project_id == project_id,
        Task.organization_id == ctx.organization.id,
        Task.is_deleted == False
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    assignee_name = f"{task.assignee.first_name} {task.assignee.last_name}" if task.assignee else None
    reporter_name = f"{task.reporter.first_name} {task.reporter.last_name}" if task.reporter else None
    
    return TaskResponse(
        id=task.id,
        organization_id=task.organization_id,
        project_id=task.project_id,
        name=task.name,
        description=task.description,
        status=task.status.value,
        priority=task.priority.value,
        assignee_id=task.assignee_id,
        assignee_name=assignee_name,
        reporter_id=task.reporter_id,
        reporter_name=reporter_name,
        start_date=task.start_date,
        due_date=task.due_date,
        estimated_hours=task.estimated_hours,
        actual_hours=task.actual_hours,
        progress=task.progress,
        dependencies=task.dependencies or [],
        created_at=task.created_at,
        updated_at=task.updated_at
    )


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    project_id: UUID,
    task_id: UUID,
    task_data: TaskUpdate,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Update task"""
    project = get_project_or_404(db, ctx.organization.id, project_id)
    ensure_project_permission(
        db,
        project,
        ctx.user,
        "can_edit_tasks",
        "You do not have permission to update tasks in this project",
    )

    task = db.query(Task).filter(
        Task.id == task_id,
        Task.project_id == project_id,
        Task.organization_id == ctx.organization.id,
        Task.is_deleted == False
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    previous_assignee_id = task.assignee_id

    if "assignee_id" in task_data.model_dump(exclude_unset=True):
        if not _is_active_org_member(db, ctx.organization.id, task_data.assignee_id):
            raise HTTPException(status_code=400, detail="Assignee must be an active member of this organization")
    
    # Update fields
    update_data = task_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field in ["status", "priority"] and value:
            # Convert string to enum
            if field == "status":
                value = TaskStatus(value)
            elif field == "priority":
                value = TaskPriority(value)
        setattr(task, field, value)
    
    db.commit()
    db.refresh(task)

    if task.assignee_id and task.assignee_id != previous_assignee_id and task.assignee_id != ctx.user.id:
        create_notification(
            db,
            organization_id=ctx.organization.id,
            user_id=task.assignee_id,
            project_id=project_id,
            notification_type="task_assigned",
            title="Task assigned",
            body=f"You were assigned task '{task.name}'.",
            data={"task_id": str(task.id), "project_id": str(project_id)},
        )
        db.commit()
    
    assignee_name = f"{task.assignee.first_name} {task.assignee.last_name}" if task.assignee else None
    reporter_name = f"{task.reporter.first_name} {task.reporter.last_name}" if task.reporter else None
    
    return TaskResponse(
        id=task.id,
        organization_id=task.organization_id,
        project_id=task.project_id,
        name=task.name,
        description=task.description,
        status=task.status.value,
        priority=task.priority.value,
        assignee_id=task.assignee_id,
        assignee_name=assignee_name,
        reporter_id=task.reporter_id,
        reporter_name=reporter_name,
        start_date=task.start_date,
        due_date=task.due_date,
        estimated_hours=task.estimated_hours,
        actual_hours=task.actual_hours,
        progress=task.progress,
        dependencies=task.dependencies or [],
        created_at=task.created_at,
        updated_at=task.updated_at
    )


@router.patch("/{task_id}/status", response_model=TaskResponse)
async def update_task_status(
    project_id: UUID,
    task_id: UUID,
    status_data: TaskStatusUpdate,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Update task status"""
    project = get_project_or_404(db, ctx.organization.id, project_id)
    ensure_project_permission(
        db,
        project,
        ctx.user,
        "can_edit_tasks",
        "You do not have permission to update tasks in this project",
    )

    task = db.query(Task).filter(
        Task.id == task_id,
        Task.project_id == project_id,
        Task.organization_id == ctx.organization.id,
        Task.is_deleted == False
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task.status = TaskStatus(status_data.status)
    
    # Auto-update progress based on status
    if task.status == TaskStatus.COMPLETED:
        task.progress = 100
    elif task.status == TaskStatus.PENDING:
        task.progress = 0
    
    db.commit()
    db.refresh(task)
    
    assignee_name = f"{task.assignee.first_name} {task.assignee.last_name}" if task.assignee else None
    reporter_name = f"{task.reporter.first_name} {task.reporter.last_name}" if task.reporter else None
    
    return TaskResponse(
        id=task.id,
        organization_id=task.organization_id,
        project_id=task.project_id,
        name=task.name,
        description=task.description,
        status=task.status.value,
        priority=task.priority.value,
        assignee_id=task.assignee_id,
        assignee_name=assignee_name,
        reporter_id=task.reporter_id,
        reporter_name=reporter_name,
        start_date=task.start_date,
        due_date=task.due_date,
        estimated_hours=task.estimated_hours,
        actual_hours=task.actual_hours,
        progress=task.progress,
        dependencies=task.dependencies or [],
        created_at=task.created_at,
        updated_at=task.updated_at
    )


@router.patch("/{task_id}/progress", response_model=TaskResponse)
async def update_task_progress(
    project_id: UUID,
    task_id: UUID,
    progress_data: TaskProgressUpdate,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Update task progress"""
    project = get_project_or_404(db, ctx.organization.id, project_id)
    ensure_project_permission(
        db,
        project,
        ctx.user,
        "can_edit_tasks",
        "You do not have permission to update tasks in this project",
    )

    task = db.query(Task).filter(
        Task.id == task_id,
        Task.project_id == project_id,
        Task.organization_id == ctx.organization.id,
        Task.is_deleted == False
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task.progress = progress_data.progress
    
    # Auto-update status based on progress
    if task.progress == 100:
        task.status = TaskStatus.COMPLETED
    elif task.progress > 0 and task.status == TaskStatus.PENDING:
        task.status = TaskStatus.IN_PROGRESS
    
    db.commit()
    db.refresh(task)
    
    assignee_name = f"{task.assignee.first_name} {task.assignee.last_name}" if task.assignee else None
    reporter_name = f"{task.reporter.first_name} {task.reporter.last_name}" if task.reporter else None
    
    return TaskResponse(
        id=task.id,
        organization_id=task.organization_id,
        project_id=task.project_id,
        name=task.name,
        description=task.description,
        status=task.status.value,
        priority=task.priority.value,
        assignee_id=task.assignee_id,
        assignee_name=assignee_name,
        reporter_id=task.reporter_id,
        reporter_name=reporter_name,
        start_date=task.start_date,
        due_date=task.due_date,
        estimated_hours=task.estimated_hours,
        actual_hours=task.actual_hours,
        progress=task.progress,
        dependencies=task.dependencies or [],
        created_at=task.created_at,
        updated_at=task.updated_at
    )


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    project_id: UUID,
    task_id: UUID,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Soft delete task"""
    project = get_project_or_404(db, ctx.organization.id, project_id)
    ensure_project_permission(
        db,
        project,
        ctx.user,
        "can_edit_tasks",
        "You do not have permission to delete tasks in this project",
    )

    task = db.query(Task).filter(
        Task.id == task_id,
        Task.project_id == project_id,
        Task.organization_id == ctx.organization.id,
        Task.is_deleted == False
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    from datetime import datetime
    task.is_deleted = True
    task.deleted_at = datetime.utcnow()
    
    db.commit()
    
    return None
