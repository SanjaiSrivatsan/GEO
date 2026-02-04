from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Integer, Boolean, Enum as SQLEnum
from sqlalchemy.sql import func
from app.core.database import Base
import uuid
import enum


class LocationStatus(enum.Enum):
    """Google Business location status"""
    VERIFIED = "Verified"
    NEEDS_ATTENTION = "Needs attention"
    LIMITED_ACCESS = "Limited access"
    NOT_ELIGIBLE = "Not eligible"


class GoogleLocation(Base):
    """Google Business Profile location"""
    __tablename__ = "google_locations"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    business_profile_id = Column(String(36), ForeignKey("business_profiles.id", ondelete="SET NULL"), index=True)
    
    # Google Business Profile data
    google_location_id = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(255))
    primary_location = Column(String(255))
    website = Column(String(500))
    
    # Location details
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100))
    full_address = Column(Text)
    
    # Status and metrics
    status = Column(SQLEnum(LocationStatus), nullable=False)
    review_count = Column(Integer, default=0)
    average_rating = Column(String(10))
    
    # Sync status
    is_synced = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    last_fetched_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<GoogleLocation(id={self.id}, name={self.name}, status={self.status})>"
