from datetime import datetime
from typing import Any, Optional

from pydantic import UUID4, BaseModel


class NotificationResponse(BaseModel):
    id: UUID4
    organization_id: UUID4
    user_id: UUID4
    project_id: Optional[UUID4] = None
    notification_type: str
    title: str
    body: str
    data: dict[str, Any] = {}
    is_read: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    total: int
    unread_count: int
    page: int
    page_size: int
    total_pages: int
