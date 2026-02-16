from sqlalchemy import Column, String, Integer, Boolean, Enum as SQLEnum, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import enum

from app.db.session import Base
from app.db.base import TimestampMixin, UUIDMixin, SoftDeleteMixin


def _enum_values(enum_cls):
    return [item.value for item in enum_cls]


class SubscriptionTier(str, enum.Enum):
    FREE = "free"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class Organization(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "organizations"
    
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    subscription_tier = Column(
        SQLEnum(SubscriptionTier, values_callable=_enum_values, native_enum=False),
        default=SubscriptionTier.FREE.value,
        nullable=False,
    )
    max_projects = Column(Integer, default=10)
    max_users = Column(Integer, default=5)
    settings = Column(JSONB, default=dict)
    logo_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    members = relationship("OrganizationMember", back_populates="organization")
    projects = relationship("Project", back_populates="organization")


class OrgRole(str, enum.Enum):
    ORG_ADMIN = "Org_Admin"
    MEMBER = "Member"
    VIEWER = "Viewer"


class MembershipStatus(str, enum.Enum):
    ACTIVE = "Active"
    INVITED = "Invited"
    SUSPENDED = "Suspended"


class OrganizationMember(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "organization_members"
    
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    org_role = Column(
        SQLEnum(OrgRole, values_callable=_enum_values, native_enum=False),
        default=OrgRole.MEMBER.value,
        nullable=False,
    )
    status = Column(
        SQLEnum(MembershipStatus, values_callable=_enum_values, native_enum=False),
        default=MembershipStatus.ACTIVE.value,
        nullable=False,
    )
    
    # Relationships
    organization = relationship("Organization", back_populates="members")
    user = relationship("User", back_populates="org_memberships")
    
    __table_args__ = (
        Index('idx_org_member_lookup', 'organization_id', 'user_id'),
        UniqueConstraint('organization_id', 'user_id', name='uq_org_user'),
    )
