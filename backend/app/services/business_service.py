"""
Business Profile Service

Handles business profile creation and management operations.
"""

import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.business_profile import BusinessProfile, CrawlStatus
from app.schemas.business import BusinessProfileCreate


class BusinessService:
    """Service for business profile operations"""

    @staticmethod
    def create_business_profile(
        db: Session,
        user_id: str,
        profile_data: BusinessProfileCreate
    ) -> BusinessProfile:
        """
        Create a new business profile for a user.

        Args:
            db: Database session
            user_id: UUID of the authenticated user
            profile_data: Business profile data from request

        Returns:
            Created BusinessProfile instance

        Raises:
            IntegrityError: If user_id doesn't exist or other DB constraint violated
        """
        # Create business profile instance
        business_profile = BusinessProfile(
            id=str(uuid.uuid4()),
            user_id=user_id,
            name=profile_data.name,
            category=profile_data.category,
            primary_location=profile_data.primary_location,
            website=profile_data.website,
            brand_voice=profile_data.brand_voice,
            main_goal=profile_data.main_goal,
            total_pages_crawled="0",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Set crawl_status using string value to avoid enum serialization issues
        business_profile.crawl_status = "not_started"

        # Add to database
        db.add(business_profile)
        db.commit()
        db.refresh(business_profile)

        return business_profile

    @staticmethod
    def get_user_profiles(db: Session, user_id: str) -> list[BusinessProfile]:
        """
        Get all business profiles for a user.

        Args:
            db: Database session
            user_id: UUID of the user

        Returns:
            List of BusinessProfile instances
        """
        return db.query(BusinessProfile).filter(
            BusinessProfile.user_id == user_id
        ).order_by(BusinessProfile.created_at.desc()).all()

    @staticmethod
    def get_profile_by_id(db: Session, profile_id: str, user_id: str) -> BusinessProfile | None:
        """
        Get a specific business profile by ID, ensuring it belongs to the user.

        Args:
            db: Database session
            profile_id: UUID of the business profile
            user_id: UUID of the authenticated user

        Returns:
            BusinessProfile instance or None if not found
        """
        return db.query(BusinessProfile).filter(
            BusinessProfile.id == profile_id,
            BusinessProfile.user_id == user_id
        ).first()
