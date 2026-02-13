from sqlalchemy import Column, String, BigInteger, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base
from app.db.base import TimestampMixin, UUIDMixin, SoftDeleteMixin


class Document(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "documents"
    
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    document_type = Column(String, nullable=True, index=True)  # Drawing, Report, Photos, Contract, CAD, Other
    file_size = Column(BigInteger, nullable=True)  # bytes
    mime_type = Column(String, nullable=True)
    storage_provider = Column(String, default="local", nullable=False)  # local, r2, s3
    storage_key = Column(String, nullable=False)  # path or cloud key
    version = Column(Integer, default=1, nullable=False)
    parent_document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    uploaded_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    checksum = Column(String, nullable=True)  # SHA256 for integrity
    
    # Relationships
    organization = relationship("Organization")
    project = relationship("Project", back_populates="documents")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])
    parent_document = relationship("Document", remote_side="Document.id", backref="versions")
