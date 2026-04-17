"""
Brand Mention Model
Stores off-site brand mentions discovered from web search
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime
import enum


class MentionType(enum.Enum):
    """Type of brand mention"""
    DIRECTORY = "directory"  # Business directories (Yelp, YellowPages, etc.)
    REVIEW = "review"  # Review sites and platforms
    ARTICLE = "article"  # News articles and press
    BLOG = "blog"  # Blog posts and content sites
    COMPARISON = "comparison"  # Comparison and ranking sites
    SOCIAL = "social"  # Social media (if indexable)
    OTHER = "other"  # Other types


class MentionStatus(enum.Enum):
    """Processing status of mention"""
    DISCOVERED = "discovered"  # Just discovered
    PROCESSED = "processed"  # Content extracted and analyzed
    IGNORED = "ignored"  # Marked as irrelevant


class SentimentType(enum.Enum):
    """Sentiment of the mention"""
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    UNKNOWN = "unknown"


class BrandMention(Base):
    """
    Brand Mention Model
    
    Represents an off-site mention of a business found through web search.
    Linked to a business profile.
    """
    __tablename__ = "brand_mentions"
    
    # Primary Key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Foreign Keys
    business_profile_id = Column(String(36), ForeignKey("business_profiles.id"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    
    # Source Information
    source_url = Column(Text, nullable=False)  # Full URL of the mention
    source_domain = Column(String(255), nullable=False, index=True)  # Domain only (e.g., yelp.com)
    canonical_url = Column(Text, nullable=True)  # Canonical URL for de-duplication
    
    # Content
    page_title = Column(Text, nullable=True)
    extracted_snippet = Column(Text, nullable=True)  # Text snippet containing the mention
    full_text = Column(Text, nullable=True)  # Full extracted text (optional)
    
    # Classification
    mention_type = Column(SQLEnum(MentionType, values_callable=lambda x: [e.value for e in x]), nullable=False, default=MentionType.OTHER, index=True)
    sentiment = Column(SQLEnum(SentimentType, values_callable=lambda x: [e.value for e in x]), nullable=False, default=SentimentType.UNKNOWN, index=True)
    status = Column(SQLEnum(MentionStatus, values_callable=lambda x: [e.value for e in x]), nullable=False, default=MentionStatus.DISCOVERED, index=True)
    
    # Metadata
    search_query = Column(String(500), nullable=True)  # Query that found this mention
    search_position = Column(String(10), nullable=True)  # Position in search results (e.g., "1", "5")
    discovery_method = Column(String(100), nullable=True)  # e.g., "google_search", "bing_search"
    
    # Timestamps
    discovered_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    processed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    business_profile = relationship("BusinessProfile", back_populates="brand_mentions")
    user = relationship("User")
    
    def __repr__(self):
        return f"<BrandMention(id={self.id}, domain={self.source_domain}, type={self.mention_type.value})>"
