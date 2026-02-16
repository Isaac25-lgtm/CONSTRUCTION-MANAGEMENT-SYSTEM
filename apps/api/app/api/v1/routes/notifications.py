import math
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.api.v1.dependencies import OrgContext, get_org_context
from app.db.session import get_db
from app.models.notification import Notification
from app.models.project import Project, ProjectMember
from app.schemas.notification import NotificationListResponse, NotificationResponse
from app.services.notifications import ensure_due_soon_milestone_notifications

router = APIRouter()


def _get_accessible_project_ids(db: Session, ctx: OrgContext) -> list[UUID]:
    member_project_ids = db.query(ProjectMember.project_id).filter(
        ProjectMember.user_id == ctx.user.id,
        ProjectMember.can_view_project == True,
    )
    projects = (
        db.query(Project.id)
        .filter(
            Project.organization_id == ctx.organization.id,
            Project.is_deleted == False,
        )
        .filter(
            or_(
                Project.manager_id == ctx.user.id,
                Project.created_by == ctx.user.id,
                Project.id.in_(member_project_ids),
            )
        )
        .all()
    )
    return [row.id for row in projects]


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    project_id: Optional[UUID] = Query(None),
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db),
):
    accessible_project_ids = _get_accessible_project_ids(db, ctx)
    if project_id and project_id not in accessible_project_ids:
        raise HTTPException(status_code=403, detail="You do not have access to this project")

    # Generate due-soon milestone notifications for visible projects.
    target_projects = [project_id] if project_id else accessible_project_ids
    created = ensure_due_soon_milestone_notifications(
        db,
        organization_id=ctx.organization.id,
        user_id=ctx.user.id,
        project_ids=target_projects,
    )
    if created:
        db.commit()

    query = db.query(Notification).filter(
        Notification.organization_id == ctx.organization.id,
        Notification.user_id == ctx.user.id,
    )
    if project_id:
        query = query.filter(Notification.project_id == project_id)
    if unread_only:
        query = query.filter(Notification.is_read == False)

    total = query.count()
    unread_count = (
        db.query(func.count(Notification.id))
        .filter(
            Notification.organization_id == ctx.organization.id,
            Notification.user_id == ctx.user.id,
            Notification.is_read == False,
        )
        .scalar()
        or 0
    )
    offset = (page - 1) * page_size
    notifications = (
        query.order_by(Notification.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )

    items = [
        NotificationResponse(
            id=item.id,
            organization_id=item.organization_id,
            user_id=item.user_id,
            project_id=item.project_id,
            notification_type=item.notification_type,
            title=item.title,
            body=item.body,
            data=item.data or {},
            is_read=item.is_read,
            created_at=item.created_at,
            updated_at=item.updated_at,
        )
        for item in notifications
    ]

    total_pages = math.ceil(total / page_size) if total > 0 else 0
    return NotificationListResponse(
        items=items,
        total=total,
        unread_count=unread_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: UUID,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db),
):
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.organization_id == ctx.organization.id,
            Notification.user_id == ctx.user.id,
        )
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return NotificationResponse(
        id=notification.id,
        organization_id=notification.organization_id,
        user_id=notification.user_id,
        project_id=notification.project_id,
        notification_type=notification.notification_type,
        title=notification.title,
        body=notification.body,
        data=notification.data or {},
        is_read=notification.is_read,
        created_at=notification.created_at,
        updated_at=notification.updated_at,
    )


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_notifications_read(
    project_id: Optional[UUID] = Query(None),
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db),
):
    query = db.query(Notification).filter(
        Notification.organization_id == ctx.organization.id,
        Notification.user_id == ctx.user.id,
        Notification.is_read == False,
    )
    if project_id:
        query = query.filter(Notification.project_id == project_id)

    query.update({Notification.is_read: True}, synchronize_session=False)
    db.commit()
    return None
