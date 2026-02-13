from pydantic import BaseModel, UUID4, Field
from typing import Optional, List
from datetime import datetime


# Message Schemas
class MessageCreate(BaseModel):
    project_id: Optional[UUID4] = None
    task_id: Optional[UUID4] = None
    content: str = Field(..., min_length=1)
    message_type: str = "text"  # text, announcement, system
    attachments: List[UUID4] = []


class MessageResponse(BaseModel):
    id: UUID4
    organization_id: UUID4
    project_id: Optional[UUID4] = None
    task_id: Optional[UUID4] = None
    sender_id: Optional[UUID4] = None
    sender_name: Optional[str] = None
    content: str
    message_type: str
    is_read: bool
    attachments: list = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MessageListResponse(BaseModel):
    items: List[MessageResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
