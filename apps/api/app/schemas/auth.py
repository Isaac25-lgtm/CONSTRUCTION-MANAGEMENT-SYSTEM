from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)


class LoginResponse(BaseModel):
    success: bool = True
    data: dict
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "access_token": "eyJ...",
                    "token_type": "bearer",
                    "user": {
                        "id": "uuid",
                        "email": "user@example.com",
                        "first_name": "John",
                        "last_name": "Doe",
                        "role": "Project_Manager"
                    }
                }
            }
        }


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    role: str
    phone_number: Optional[str] = None
    
    class Config:
        from_attributes = True
