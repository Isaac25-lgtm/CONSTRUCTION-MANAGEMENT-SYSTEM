from sqlalchemy import Column, String, Date, ForeignKey, Enum as SQLEnum, Text, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.db.session import Base
from app.db.base import TimestampMixin, UUIDMixin, SoftDeleteMixin


class ExpenseStatus(str, enum.Enum):
    PENDING = "Pending"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    PAID = "Paid"


class Expense(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "expenses"
    
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    description = Column(String, nullable=False)
    category = Column(String, nullable=False, index=True)  # Materials, Labor, Equipment, Services
    amount = Column(Numeric(15, 2), nullable=False)
    vendor = Column(String, nullable=True)
    expense_date = Column(Date, nullable=False, index=True)
    status = Column(SQLEnum(ExpenseStatus), default=ExpenseStatus.PENDING, nullable=False, index=True)
    logged_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    receipt_document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    
    # Relationships
    organization = relationship("Organization")
    project = relationship("Project", back_populates="expenses")
    logged_by = relationship("User", foreign_keys=[logged_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    receipt = relationship("Document", foreign_keys=[receipt_document_id])
