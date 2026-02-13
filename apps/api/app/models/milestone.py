from sqlalchemy import Column, String, Date, Integer, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
import enum

from app.db.session import Base
from app.db.base import TimestampMixin, UUIDMixin, SoftDeleteMixin


class MilestoneStatus(str, enum.Enum):
    PENDING = "Pending"
    ON_TRACK = "On Track"
    AT_RISK = "At Risk"
    DELAYED = "Delayed"
    COMPLETED = "Completed"


class Milestone(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "milestones"
    
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    target_date = Column(Date, nullable=False, index=True)
    actual_date = Column(Date, nullable=True)
    status = Column(SQLEnum(MilestoneStatus), default=MilestoneStatus.PENDING, nullable=False, index=True)
    completion_percentage = Column(Integer, default=0, nullable=False)  # 0-100
    dependencies = Column(ARRAY(UUID(as_uuid=True)), default=list)  # Milestone IDs this depends on
    
    # Relationships
    organization = relationship("Organization")
    project = relationship("Project", back_populates="milestones")
