from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import TimestampMixin, UUIDMixin
from app.db.session import Base


class RevokedToken(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "revoked_tokens"

    jti = Column(String, nullable=False, unique=True, index=True)
    token_type = Column(String, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)

    user = relationship("User")
