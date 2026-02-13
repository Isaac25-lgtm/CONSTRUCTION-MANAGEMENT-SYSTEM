from sqlalchemy import Column, String, Date, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.db.session import Base
from app.db.base import TimestampMixin, UUIDMixin, SoftDeleteMixin


class RiskLevel(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class RiskStatus(str, enum.Enum):
    IDENTIFIED = "Identified"
    ACTIVE = "Active"
    MONITORING = "Monitoring"
    MITIGATED = "Mitigated"
    CLOSED = "Closed"


class Risk(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "risks"
    
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    description = Column(Text, nullable=False)
    category = Column(String, nullable=True, index=True)  # Supply Chain, Environmental, Resource, Financial, Safety
    probability = Column(SQLEnum(RiskLevel), nullable=False)
    impact = Column(SQLEnum(RiskLevel), nullable=False)
    status = Column(SQLEnum(RiskStatus), default=RiskStatus.IDENTIFIED, nullable=False, index=True)
    mitigation_plan = Column(Text, nullable=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    identified_date = Column(Date, nullable=False, index=True)
    review_date = Column(Date, nullable=True)
    
    # Relationships
    organization = relationship("Organization")
    project = relationship("Project", back_populates="risks")
    owner = relationship("User", foreign_keys=[owner_id])
