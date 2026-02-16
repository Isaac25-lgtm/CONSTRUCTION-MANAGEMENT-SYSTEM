from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, UUID4


class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    slug: str = Field(..., min_length=2, max_length=100)


class OrganizationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    slug: Optional[str] = Field(None, min_length=2, max_length=100)
    subscription_tier: Optional[str] = None
    max_projects: Optional[int] = Field(None, ge=1)
    max_users: Optional[int] = Field(None, ge=1)
    logo_url: Optional[str] = None
    is_active: Optional[bool] = None


class OrganizationMemberResponse(BaseModel):
    user_id: UUID4
    email: str
    first_name: str
    last_name: str
    org_role: str
    status: str
    joined_at: datetime

    class Config:
        from_attributes = True


class OrganizationResponse(BaseModel):
    id: UUID4
    name: str
    slug: str
    subscription_tier: str
    max_projects: int
    max_users: int
    logo_url: Optional[str] = None
    is_active: bool
    member_count: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OrganizationListResponse(BaseModel):
    items: List[OrganizationResponse]
    total: int
