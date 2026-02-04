from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Integer, Enum as SQLEnum
from sqlalchemy.sql import func
from app.core.database import Base
import uuid
import enum


class CrawlStatus(enum.Enum):
    """Website crawl status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class WebsiteContent(Base):
    """Website content storage - raw and cleaned HTML"""
    __tablename__ = "website_content"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_profile_id = Column(String(36), ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Crawl metadata
    url = Column(String(2048), nullable=False)
    page_type = Column(String(100))  # homepage, about, contact, faq, service, etc.
    crawl_status = Column(SQLEnum(CrawlStatus), default=CrawlStatus.PENDING, nullable=False)
    
    # Content storage
    raw_html = Column(Text)  # Original HTML
    cleaned_text = Column(Text)  # Extracted text content
    title = Column(String(500))
    meta_description = Column(Text)
    h1_tags = Column(Text)  # JSON array
    h2_tags = Column(Text)  # JSON array
    
    # Schema.org data
    schema_markup = Column(Text)  # JSON
    
    # NAP data
    extracted_name = Column(String(255))
    extracted_address = Column(Text)
    extracted_phone = Column(String(50))
    
    # Analysis
    word_count = Column(Integer)
    entity_mentions = Column(Integer, default=0)
    location_mentions = Column(Integer, default=0)
    
    # Timestamps
    crawled_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<WebsiteContent(id={self.id}, url={self.url}, status={self.crawl_status})>"
