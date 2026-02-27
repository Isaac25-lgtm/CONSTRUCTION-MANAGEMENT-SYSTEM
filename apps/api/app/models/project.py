from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    Enum as SQLEnum,
    ForeignKey,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base
from app.db.base import TimestampMixin, UUIDMixin, SoftDeleteMixin
import enum


class ProjectStatus(str, enum.Enum):
    PLANNING = "Planning"
    IN_PROGRESS = "In_Progress"
    ON_HOLD = "On_Hold"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"


class ProjectPriority(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class Project(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "projects"
    
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)
    project_name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(ProjectStatus), default=ProjectStatus.PLANNING, nullable=False, index=True)
    priority = Column(SQLEnum(ProjectPriority), default=ProjectPriority.MEDIUM, nullable=False)
    manager_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    total_budget = Column(Numeric(15, 2), nullable=False)
    location = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    client_name = Column(String, nullable=True)
    contract_type = Column(String, nullable=True)

    __table_args__ = (
        CheckConstraint("end_date >= start_date", name="ck_projects_end_date_after_start_date"),
        CheckConstraint("total_budget >= 0", name="ck_projects_total_budget_non_negative"),
    )
    
    # Relationships
    organization = relationship("Organization", back_populates="projects")
    parent_project = relationship("Project", remote_side="Project.id", backref="child_projects")
    manager = relationship("User", back_populates="managed_projects", foreign_keys=[manager_id])
    creator = relationship("User", back_populates="created_projects", foreign_keys=[created_by])
    members = relationship("ProjectMember", back_populates="project")
    tasks = relationship("Task", back_populates="project")
    milestones = relationship("Milestone", back_populates="project")
    documents = relationship("Document", back_populates="project")
    expenses = relationship("Expense", back_populates="project")
    risks = relationship("Risk", back_populates="project")
    messages = relationship("Message", back_populates="project")


class ProjectMember(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "project_members"
    
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    role_in_project = Column(String, nullable=True)  # Optional project-specific role override
    joined_at = Column(Date, nullable=False)
    can_view_project = Column(Boolean, nullable=False, default=True)
    can_post_messages = Column(Boolean, nullable=False, default=True)
    can_upload_documents = Column(Boolean, nullable=False, default=True)
    can_edit_tasks = Column(Boolean, nullable=False, default=True)
    can_manage_milestones = Column(Boolean, nullable=False, default=True)
    can_manage_risks = Column(Boolean, nullable=False, default=True)
    can_manage_expenses = Column(Boolean, nullable=False, default=True)
    can_approve_expenses = Column(Boolean, nullable=False, default=True)
    
    # Relationships
    project = relationship("Project", back_populates="members")
    user = relationship("User", back_populates="project_memberships")
    
    __table_args__ = (
        {'schema': None},
    )
