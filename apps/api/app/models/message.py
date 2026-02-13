from sqlalchemy import Column, String, ForeignKey, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.db.session import Base
from app.db.base import TimestampMixin, UUIDMixin, SoftDeleteMixin


class Message(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "messages"
    
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)  # Optional
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True, index=True)  # Optional
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    content = Column(Text, nullable=False)
    message_type = Column(String, default="text", nullable=False)  # text, announcement, system
    is_read = Column(Boolean, default=False, nullable=False)
    attachments = Column(JSONB, default=list)  # Array of document IDs
    
    # Relationships
    organization = relationship("Organization")
    project = relationship("Project", back_populates="messages")
    task = relationship("Task")
    sender = relationship("User", foreign_keys=[sender_id])
