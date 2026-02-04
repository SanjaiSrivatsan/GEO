"""
Business Profile Schemas

Request/response models for business profile operations.
"""

from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class BusinessProfileCreate(BaseModel):
    """Schema for creating a business profile"""
    name: str = Field(..., min_length=1, max_length=200, description="Business name")
    category: str = Field(..., min_length=1, max_length=100, description="Business category")
    primary_location: str = Field(..., min_length=1, max_length=200, description="Primary business location")
    website: str = Field(default="", max_length=500, description="Business website URL")
    brand_voice: str = Field(default="", max_length=500, description="Brand voice/tone")
    main_goal: str = Field(default="", max_length=500, description="Main business goal")

    @field_validator('name', 'category', 'primary_location')
    @classmethod
    def validate_required_fields(cls, v: str) -> str:
        """Ensure required fields are not just whitespace"""
        if not v.strip():
            raise ValueError("Field cannot be empty or whitespace only")
        return v.strip()

    @field_validator('website', 'brand_voice', 'main_goal')
    @classmethod
    def strip_optional_fields(cls, v: str) -> str:
        """Strip whitespace from optional fields"""
        return v.strip()


class BusinessProfileResponse(BaseModel):
    """Schema for business profile response"""
    id: str
    user_id: str
    name: str
    category: str
    primary_location: str
    website: str
    brand_voice: str
    main_goal: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BusinessProfileCreateResponse(BaseModel):
    """Schema for business profile creation response"""
    profile: BusinessProfileResponse
    message: str = "Business profile created successfully"
