from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Integer, Numeric, Enum as SQLEnum
from sqlalchemy.sql import func
from app.core.database import Base
import uuid
import enum


class SentimentLabel(str, enum.Enum):
    POSITIVE = "Positive"
    NEUTRAL = "Neutral"
    NEGATIVE = "Negative"


class GoogleReview(Base):
    """Google Business reviews"""
    __tablename__ = "google_reviews"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    google_location_id = Column(String(36), ForeignKey("google_locations.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Review identifiers
    google_review_id = Column(String(255), unique=True, nullable=False, index=True)
    
    # Review content
    reviewer_name = Column(String(255))
    reviewer_photo_url = Column(String(500))
    rating = Column(Integer, nullable=False)  # 1-5
    review_text = Column(Text)
    review_date = Column(DateTime(timezone=True), nullable=False)
    
    # Sentiment analysis (AI-powered)
    sentiment_score = Column(Numeric(4, 3))  # -1.000 to 1.000
    sentiment_label = Column(SQLEnum(SentimentLabel))
    
    # Keywords extraction
    extracted_keywords = Column(Text)  # JSON array
    
    # AI-generated reply suggestion
    suggested_reply = Column(Text)
    suggested_reply_preset = Column(String(50))  # e.g., "thank_positive", "apologize_negative"
    
    # Owner response
    owner_reply = Column(Text)
    owner_reply_date = Column(DateTime(timezone=True))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<GoogleReview(id={self.id}, rating={self.rating}, sentiment={self.sentiment_label})>"
