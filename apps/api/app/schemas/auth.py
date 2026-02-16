from pydantic import BaseModel, EmailStr, Field, UUID4
from typing import Optional, List
from datetime import datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)


class OrganizationMembershipResponse(BaseModel):
    organization_id: UUID4
    organization_name: str
    organization_slug: str
    org_role: str
    status: str
    
    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    id: UUID4
    email: str
    first_name: str
    last_name: str
    role: str
    phone_number: Optional[str] = None
    is_active: bool
    last_login: Optional[datetime] = None
    organizations: List[OrganizationMembershipResponse] = Field(default_factory=list)
    
    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    active_organization_id: Optional[UUID4] = None
    user: UserResponse
    
    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJ...",
                "token_type": "bearer",
                "user": {
                    "id": "uuid",
                    "email": "user@example.com",
                    "first_name": "John",
                    "last_name": "Doe",
                    "role": "Project_Manager",
                    "organizations": [
                        {
                            "organization_id": "uuid",
                            "organization_name": "Internal Projects Organization",
                            "organization_slug": "internal-projects",
                            "org_role": "Org_Admin",
                            "status": "Active"
                        }
                    ]
                }
            }
        }


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    """Not used - refresh token comes from httpOnly cookie"""
    pass


class LogoutResponse(BaseModel):
    message: str = "Logged out successfully"
