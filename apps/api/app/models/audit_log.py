from sqlalchemy import Column, String, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.db.session import Base
from app.db.base import TimestampMixin, UUIDMixin


class AuditLog(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "audit_logs"
    
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String, nullable=False, index=True)  # CREATE, UPDATE, DELETE, LOGIN, LOGOUT
    entity_type = Column(String, nullable=False, index=True)  # Project, Task, User, etc.
    entity_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    before_state = Column(JSONB, nullable=True)
    after_state = Column(JSONB, nullable=True)
    details = Column(JSONB, nullable=True)  # {ip_address, user_agent, api_endpoint, etc.}
    description = Column(Text, nullable=True)
    
    # Relationships
    organization = relationship("Organization")
    user = relationship("User")
    
    __table_args__ = (
        Index('idx_audit_org_entity', 'organization_id', 'entity_type'),
        Index('idx_audit_org_time', 'organization_id', 'created_at'),
        Index('idx_audit_user_time', 'user_id', 'created_at'),
    )
