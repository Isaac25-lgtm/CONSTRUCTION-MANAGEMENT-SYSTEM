from sqlalchemy import Column, Date, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import TimestampMixin, UUIDMixin
from app.db.session import Base


class BOQHeader(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "boq_headers"

    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String, nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    currency = Column(String, nullable=False, default="UGX")

    organization = relationship("Organization")
    project = relationship("Project")
    items = relationship(
        "BOQItem",
        back_populates="header",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class BOQItem(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "boq_items"

    header_id = Column(
        UUID(as_uuid=True),
        ForeignKey("boq_headers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    parent_item_id = Column(
        UUID(as_uuid=True),
        ForeignKey("boq_items.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    item_code = Column(String, nullable=True)
    description = Column(Text, nullable=False)
    unit = Column(String, nullable=True)
    quantity = Column(Numeric(15, 4), nullable=False, default=0)
    rate = Column(Numeric(15, 4), nullable=False, default=0)
    budget_cost = Column(Numeric(15, 2), nullable=False, default=0)
    weight_out_of_10 = Column(Integer, nullable=False, default=1)
    percent_complete = Column(Integer, nullable=False, default=0)
    actual_cost = Column(Numeric(15, 2), nullable=False, default=0)

    header = relationship("BOQHeader", back_populates="items")
    organization = relationship("Organization")
    project = relationship("Project")
    parent_item = relationship("BOQItem", remote_side="BOQItem.id", backref="children")
