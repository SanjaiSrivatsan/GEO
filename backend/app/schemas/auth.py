from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime
from typing import Optional


# Request schemas
class RegisterRequest(BaseModel):
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, max_length=100, description="Password (min 8 characters)")
    
    @field_validator('password')
    @classmethod
    def validate_password_bytes(cls, v: str) -> str:
        """Ensure password does not exceed bcrypt's 72 byte limit"""
        if len(v.encode('utf-8')) > 72:
            raise ValueError('Password must be 72 characters or fewer')
        return v
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "email": "user@example.com",
                    "password": "SecurePassword123!"
                }
            ]
        }
    }


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")
    
    @field_validator('password')
    @classmethod
    def validate_password_bytes(cls, v: str) -> str:
        """Ensure password does not exceed bcrypt's 72 byte limit"""
        if len(v.encode('utf-8')) > 72:
            raise ValueError('Password must be 72 characters or fewer')
        return v
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "email": "user@example.com",
                    "password": "SecurePassword123!"
                }
            ]
        }
    }


# Response schemas
class TokenResponse(BaseModel):
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiry time in seconds")
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    "token_type": "bearer",
                    "expires_in": 86400
                }
            ]
        }
    }


class UserResponse(BaseModel):
    id: str = Field(..., description="User UUID")
    email: EmailStr = Field(..., description="User email address")
    is_active: bool = Field(..., description="Account active status")
    created_at: datetime = Field(..., description="Account creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "examples": [
                {
                    "id": "550e8400-e29b-41d4-a716-446655440000",
                    "email": "user@example.com",
                    "is_active": True,
                    "created_at": "2026-01-27T10:30:00Z",
                    "updated_at": "2026-01-27T10:30:00Z"
                }
            ]
        }
    }


class AuthResponse(BaseModel):
    """Combined response for login/register"""
    user: UserResponse
    token: TokenResponse
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "user": {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "email": "user@example.com",
                        "is_active": True,
                        "created_at": "2026-01-27T10:30:00Z",
                        "updated_at": "2026-01-27T10:30:00Z"
                    },
                    "token": {
                        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        "token_type": "bearer",
                        "expires_in": 86400
                    }
                }
            ]
        }
    }
