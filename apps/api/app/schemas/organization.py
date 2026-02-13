from pydantic import BaseModel, UUID4, Field
from typing import Optional, List
from datetime import datetime


# Organization Schemas
class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    slug: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None


class OrganizationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None


class OrganizationMemberResponse(BaseModel):
    user_id: UUID4
    email: str
    first_name: str
    last_name: str
    role: str
    status: str
    joined_at: datetime

    class Config:
        from_attributes = True


class OrganizationResponse(BaseModel):
    id: UUID4
    name: str
    slug: str
    description: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    subscription_tier: str
    is_active: bool
    member_count: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OrganizationListResponse(BaseModel):
    items: List[OrganizationResponse]
    total: int
