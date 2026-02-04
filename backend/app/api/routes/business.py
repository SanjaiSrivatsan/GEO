"""
Business Profile API Routes

Endpoints for creating and managing business profiles.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.business import (
    BusinessProfileCreate,
    BusinessProfileResponse,
    BusinessProfileCreateResponse
)
from app.services.business_service import BusinessService

router = APIRouter(prefix="/business", tags=["Business"])


@router.post(
    "/profiles",
    response_model=BusinessProfileCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Business Profile",
    description="Create a new business profile for the authenticated user. Returns entity_id immediately."
)
def create_business_profile(
    profile_data: BusinessProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a business profile.

    **Required Fields:**
    - name: Business name (1-200 chars)
    - category: Business category (1-100 chars)
    - primary_location: Primary business location (1-200 chars)

    **Optional Fields:**
    - website: Business website URL
    - brand_voice: Brand voice/tone description
    - main_goal: Main business goal

    **Returns:**
    - profile: Complete business profile with entity_id
    - message: Success message

    **Errors:**
    - 400: Invalid data or missing required fields
    - 401: Not authenticated
    - 500: Database error
    """
    try:
        # Create business profile
        business_profile = BusinessService.create_business_profile(
            db=db,
            user_id=current_user.id,
            profile_data=profile_data
        )

        # Return response
        return BusinessProfileCreateResponse(
            profile=BusinessProfileResponse.model_validate(business_profile),
            message="Business profile created successfully"
        )

    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create business profile: {str(e)}"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.get(
    "/profiles",
    response_model=list[BusinessProfileResponse],
    summary="Get User's Business Profiles",
    description="Get all business profiles for the authenticated user."
)
def get_user_business_profiles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all business profiles for the authenticated user.

    **Returns:**
    - List of business profiles (newest first)

    **Errors:**
    - 401: Not authenticated
    """
    profiles = BusinessService.get_user_profiles(db=db, user_id=current_user.id)
    return [BusinessProfileResponse.model_validate(p) for p in profiles]


@router.get(
    "/profiles/current",
    response_model=BusinessProfileResponse,
    summary="Get Current Business Profile",
    description="Get the authenticated user's current (most recent) business profile."
)
def get_current_business_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the user's current business profile (most recently created).

    This endpoint is used by the dashboard to load the active business entity.

    **Returns:**
    - Business profile details

    **Errors:**
    - 401: Not authenticated
    - 404: No business profile found for user
    """
    profiles = BusinessService.get_user_profiles(db=db, user_id=current_user.id)
    
    if not profiles:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No business profile found. Please complete onboarding."
        )
    
    # Return the most recent profile (first in list, sorted by created_at desc)
    return BusinessProfileResponse.model_validate(profiles[0])


@router.get(
    "/profiles/{profile_id}",
    response_model=BusinessProfileResponse,
    summary="Get Business Profile by ID",
    description="Get a specific business profile by ID. Must belong to authenticated user."
)
def get_business_profile(
    profile_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific business profile by ID.

    **Parameters:**
    - profile_id: UUID of the business profile

    **Returns:**
    - Business profile details

    **Errors:**
    - 401: Not authenticated
    - 404: Profile not found or doesn't belong to user
    """
    profile = BusinessService.get_profile_by_id(
        db=db,
        profile_id=profile_id,
        user_id=current_user.id
    )

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business profile not found"
        )

    return BusinessProfileResponse.model_validate(profile)
