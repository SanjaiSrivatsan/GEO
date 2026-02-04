from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
import enum


class CrawlStatus(enum.Enum):
    """Website crawl status for business profile"""
    NOT_STARTED = "not_started"
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class BusinessProfile(Base):
    """Business entity profile table"""
    __tablename__ = "business_profiles"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Business details
    name = Column(String(255), nullable=False)
    category = Column(String(255), nullable=False)
    primary_location = Column(String(255), nullable=False)
    website = Column(String(500))
    brand_voice = Column(Text)
    main_goal = Column(Text)
    
    # Crawl status tracking
    crawl_status = Column(SQLEnum(CrawlStatus, values_callable=lambda x: [e.value for e in x]), default=CrawlStatus.NOT_STARTED, nullable=False)
    crawl_started_at = Column(DateTime(timezone=True))
    crawl_completed_at = Column(DateTime(timezone=True))
    crawl_error = Column(Text)  # Store error message if crawl fails
    total_pages_crawled = Column(String(10), default="0")  # String to avoid migration issues
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    brand_mentions = relationship("BrandMention", back_populates="business_profile", cascade="all, delete-orphan")
    geo_scores = relationship("GeoScore", back_populates="business_profile", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<BusinessProfile(id={self.id}, name={self.name})>"
