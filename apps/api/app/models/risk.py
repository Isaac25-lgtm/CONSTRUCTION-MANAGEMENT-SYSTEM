from sqlalchemy import Column, String, Date, ForeignKey, Enum as SQLEnum, Text, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.db.session import Base
from app.db.base import TimestampMixin, UUIDMixin, SoftDeleteMixin


class RiskProbability(str, enum.Enum):
    VERY_LOW = "Very_Low"
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    VERY_HIGH = "Very_High"


class RiskImpact(str, enum.Enum):
    VERY_LOW = "Very_Low"
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    VERY_HIGH = "Very_High"


class RiskStatus(str, enum.Enum):
    IDENTIFIED = "Identified"  # Keep for DB compatibility if needed
    OPEN = "Open"
    ACTIVE = "Active"
    MONITORING = "Monitoring"
    MITIGATED = "Mitigated"
    CLOSED = "Closed"


class Risk(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "risks"
    
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)  # Added missing title column
    description = Column(Text, nullable=False)
    category = Column(String, nullable=True, index=True)  # Supply Chain, Environmental, Resource, Financial, Safety
    probability = Column(SQLEnum(RiskProbability), nullable=False)
    impact = Column(SQLEnum(RiskImpact), nullable=False)
    risk_score = Column(Integer, nullable=True)  # Added missing risk_score column
    status = Column(SQLEnum(RiskStatus), default=RiskStatus.OPEN, nullable=False, index=True)
    mitigation_plan = Column(Text, nullable=True)
    contingency_plan = Column(Text, nullable=True)  # Added missing contingency_plan column
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    identified_date = Column(Date, nullable=False, default=func.now(), index=True) # Added default
    review_date = Column(Date, nullable=True)
    
    # Relationships
    organization = relationship("Organization")
    project = relationship("Project", back_populates="risks")
    owner = relationship("User", foreign_keys=[owner_id])
