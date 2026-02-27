from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from uuid import UUID
import math

from app.db.session import get_db
from app.schemas.message import MessageCreate, MessageResponse, MessageListResponse
from app.models.message import Message
from app.models.project import Project, ProjectMember
from app.models.task import Task
from app.services.notifications import create_notification
from app.api.v1.dependencies import (
    OrgContext,
    ensure_project_permission,
    get_org_context,
    get_project_or_404,
    is_org_admin_for_organization,
)

router = APIRouter()


@router.get("", response_model=MessageListResponse)
async def list_messages(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    limit: Optional[int] = Query(None, ge=1, le=100),
    project_id: Optional[UUID] = Query(None),
    task_id: Optional[UUID] = Query(None),
    message_type: Optional[str] = Query(None),
    unread_only: bool = Query(False),
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """List messages for the current organization"""
    query = db.query(Message).filter(
        Message.organization_id == ctx.organization.id,
        Message.is_deleted == False
    )
    
    if project_id:
        project = get_project_or_404(db, ctx.organization.id, project_id)
        ensure_project_permission(
            db,
            project,
            ctx.user,
            "can_view_project",
            "You do not have permission to view messages in this project",
        )
        query = query.filter(Message.project_id == project_id)
    else:
        accessible_project_ids = db.query(Project.id).filter(
            Project.organization_id == ctx.organization.id,
            Project.is_deleted == False,
        )
        if not is_org_admin_for_organization(db, ctx.organization.id, ctx.user.id):
            member_project_ids = db.query(ProjectMember.project_id).filter(
                ProjectMember.user_id == ctx.user.id,
                ProjectMember.can_view_project == True,
            )
            accessible_project_ids = accessible_project_ids.filter(
                or_(
                    Project.manager_id == ctx.user.id,
                    Project.created_by == ctx.user.id,
                    Project.id.in_(member_project_ids),
                )
            )
        query = query.filter(
            or_(
                Message.project_id.is_(None),
                Message.project_id.in_(accessible_project_ids),
            )
        )
    if task_id:
        task = db.query(Task).filter(
            Task.id == task_id,
            Task.organization_id == ctx.organization.id,
            Task.is_deleted == False,
        ).first()
        if not task:
            raise HTTPException(status_code=400, detail="Task must belong to the current organization")
        task_project = get_project_or_404(db, ctx.organization.id, task.project_id)
        ensure_project_permission(
            db,
            task_project,
            ctx.user,
            "can_view_project",
            "You do not have permission to view messages for this task",
        )
        if project_id and task.project_id != project_id:
            raise HTTPException(status_code=400, detail="Task does not belong to the specified project")
        query = query.filter(Message.task_id == task_id)
    if message_type:
        query = query.filter(Message.message_type == message_type)
    if unread_only:
        query = query.filter(Message.is_read == False)

    if limit is not None:
        page = 1
        page_size = limit
    
    total = query.count()
    offset = (page - 1) * page_size
    messages = query.order_by(Message.created_at.desc()).offset(offset).limit(page_size).all()
    
    items = []
    for msg in messages:
        sender_name = f"{msg.sender.first_name} {msg.sender.last_name}" if msg.sender else None
        items.append(MessageResponse(
            id=msg.id,
            organization_id=msg.organization_id,
            project_id=msg.project_id,
            task_id=msg.task_id,
            sender_id=msg.sender_id,
            sender_name=sender_name,
            content=msg.content,
            message_type=msg.message_type,
            is_read=msg.is_read,
            attachments=msg.attachments or [],
            created_at=msg.created_at,
            updated_at=msg.updated_at
        ))
    
    total_pages = math.ceil(total / page_size) if total > 0 else 0
    
    return MessageListResponse(
        items=items, total=total, page=page, page_size=page_size, total_pages=total_pages
    )


@router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def create_message(
    message_data: MessageCreate,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Create a new message"""
    effective_project_id: Optional[UUID] = message_data.project_id

    if message_data.project_id:
        project = get_project_or_404(db, ctx.organization.id, message_data.project_id)
        ensure_project_permission(
            db,
            project,
            ctx.user,
            "can_post_messages",
            "You do not have permission to post messages in this project",
        )

    if message_data.task_id:
        task = db.query(Task).filter(
            Task.id == message_data.task_id,
            Task.organization_id == ctx.organization.id,
            Task.is_deleted == False
        ).first()
        if not task:
            raise HTTPException(status_code=400, detail="Task must belong to the current organization")
        effective_project_id = task.project_id
        if message_data.project_id and task.project_id != message_data.project_id:
            raise HTTPException(status_code=400, detail="Task does not belong to the specified project")
        task_project = get_project_or_404(db, ctx.organization.id, task.project_id)
        ensure_project_permission(
            db,
            task_project,
            ctx.user,
            "can_post_messages",
            "You do not have permission to post messages for this task",
        )

    message = Message(
        organization_id=ctx.organization.id,
        project_id=effective_project_id,
        task_id=message_data.task_id,
        sender_id=ctx.user.id,
        content=message_data.content,
        message_type=message_data.message_type,
        attachments=message_data.attachments
    )
    
    db.add(message)
    db.commit()
    db.refresh(message)

    if message.project_id:
        recipients: set[UUID] = set()
        members = db.query(ProjectMember).filter(
            ProjectMember.project_id == message.project_id,
            ProjectMember.can_view_project == True,
        ).all()
        for member in members:
            if member.user_id != ctx.user.id:
                recipients.add(member.user_id)

        project = db.query(Project).filter(
            Project.id == message.project_id,
            Project.organization_id == ctx.organization.id,
            Project.is_deleted == False,
        ).first()
        if project:
            if project.manager_id and project.manager_id != ctx.user.id:
                recipients.add(project.manager_id)
            if project.created_by and project.created_by != ctx.user.id:
                recipients.add(project.created_by)

        sender_name = f"{ctx.user.first_name} {ctx.user.last_name}".strip() or "A project member"
        for recipient_id in recipients:
            create_notification(
                db,
                organization_id=ctx.organization.id,
                user_id=recipient_id,
                project_id=message.project_id,
                notification_type="project_message",
                title="New project message",
                body=f"{sender_name}: {message.content[:140]}",
                data={"message_id": str(message.id), "project_id": str(message.project_id)},
            )
        if recipients:
            db.commit()
    
    sender_name = f"{ctx.user.first_name} {ctx.user.last_name}"
    
    return MessageResponse(
        id=message.id,
        organization_id=message.organization_id,
        project_id=message.project_id,
        task_id=message.task_id,
        sender_id=message.sender_id,
        sender_name=sender_name,
        content=message.content,
        message_type=message.message_type,
        is_read=message.is_read,
        attachments=message.attachments or [],
        created_at=message.created_at,
        updated_at=message.updated_at
    )


@router.patch("/{message_id}/read", response_model=MessageResponse)
async def mark_as_read(
    message_id: UUID,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Mark a message as read"""
    message = db.query(Message).filter(
        Message.id == message_id,
        Message.organization_id == ctx.organization.id,
        Message.is_deleted == False
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message.project_id:
        project = get_project_or_404(db, ctx.organization.id, message.project_id)
        ensure_project_permission(
            db,
            project,
            ctx.user,
            "can_view_project",
            "You do not have permission to view messages in this project",
        )
    
    message.is_read = True
    db.commit()
    db.refresh(message)
    
    sender_name = f"{message.sender.first_name} {message.sender.last_name}" if message.sender else None
    
    return MessageResponse(
        id=message.id,
        organization_id=message.organization_id,
        project_id=message.project_id,
        task_id=message.task_id,
        sender_id=message.sender_id,
        sender_name=sender_name,
        content=message.content,
        message_type=message.message_type,
        is_read=message.is_read,
        attachments=message.attachments or [],
        created_at=message.created_at,
        updated_at=message.updated_at
    )


@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message(
    message_id: UUID,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db)
):
    """Soft delete a message"""
    message = db.query(Message).filter(
        Message.id == message_id,
        Message.organization_id == ctx.organization.id,
        Message.is_deleted == False
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message.project_id:
        project = get_project_or_404(db, ctx.organization.id, message.project_id)
        ensure_project_permission(
            db,
            project,
            ctx.user,
            "can_post_messages",
            "You do not have permission to delete messages in this project",
        )
    
    from datetime import datetime
    message.is_deleted = True
    message.deleted_at = datetime.utcnow()
    db.commit()
    
    return None
