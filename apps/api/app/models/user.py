from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.db.session import Base
from app.db.base import TimestampMixin, UUIDMixin, SoftDeleteMixin
from app.core.rbac import Role


class User(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "users"
    
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    phone_number = Column(String, nullable=True)
    role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    last_login = Column(DateTime, nullable=True)
    
    # Relationships
    role = relationship("RoleModel", back_populates="users")
    created_projects = relationship("Project", back_populates="creator", foreign_keys="Project.created_by")
    managed_projects = relationship("Project", back_populates="manager", foreign_keys="Project.manager_id")
    project_memberships = relationship("ProjectMember", back_populates="user")
    assigned_tasks = relationship("Task", back_populates="assignee", foreign_keys="Task.assignee_id")
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class RoleModel(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "roles"
    
    role_name = Column(SQLEnum(Role), unique=True, nullable=False)
    description = Column(String, nullable=True)
    permissions = Column(JSONB, nullable=False, default=list)  # List of permission strings
    
    # Relationships
    users = relationship("User", back_populates="role")
