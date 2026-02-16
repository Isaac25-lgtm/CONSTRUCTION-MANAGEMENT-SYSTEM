from __future__ import annotations

from datetime import date, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.milestone import Milestone, MilestoneStatus
from app.models.notification import Notification


def create_notification(
    db: Session,
    *,
    organization_id: UUID,
    user_id: UUID,
    notification_type: str,
    title: str,
    body: str,
    project_id: Optional[UUID] = None,
    data: Optional[dict] = None,
) -> Notification:
    notification = Notification(
        organization_id=organization_id,
        user_id=user_id,
        project_id=project_id,
        notification_type=notification_type,
        title=title,
        body=body,
        data=data or {},
        is_read=False,
    )
    db.add(notification)
    return notification


def ensure_due_soon_milestone_notifications(
    db: Session,
    *,
    organization_id: UUID,
    user_id: UUID,
    project_ids: list[UUID],
    days_ahead: int = 7,
) -> int:
    """
    Create one 'milestone due soon' notification per milestone/user pair.
    Returns number of newly created notifications.
    """
    if not project_ids:
        return 0

    today = date.today()
    upper_bound = today + timedelta(days=days_ahead)

    milestones = (
        db.query(Milestone)
        .filter(
            Milestone.organization_id == organization_id,
            Milestone.project_id.in_(project_ids),
            Milestone.is_deleted == False,
            Milestone.status != MilestoneStatus.COMPLETED,
            Milestone.target_date >= today,
            Milestone.target_date <= upper_bound,
        )
        .all()
    )
    if not milestones:
        return 0

    milestone_ids = [m.id for m in milestones]
    existing = (
        db.query(Notification)
        .filter(
            Notification.organization_id == organization_id,
            Notification.user_id == user_id,
            Notification.notification_type == "milestone_due_soon",
        )
        .all()
    )
    existing_ids = set()
    for row in existing:
        raw_id = (row.data or {}).get("milestone_id")
        if raw_id:
            existing_ids.add(str(raw_id))

    created = 0
    for milestone in milestones:
        if str(milestone.id) in existing_ids:
            continue
        days_left = (milestone.target_date - today).days
        day_label = "today" if days_left == 0 else f"in {days_left} day{'s' if days_left != 1 else ''}"
        create_notification(
            db,
            organization_id=organization_id,
            user_id=user_id,
            project_id=milestone.project_id,
            notification_type="milestone_due_soon",
            title="Milestone due soon",
            body=f"{milestone.name} is due {day_label}.",
            data={"milestone_id": str(milestone.id), "target_date": milestone.target_date.isoformat()},
        )
        created += 1

    return created
