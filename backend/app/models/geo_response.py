from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Integer, Enum as SQLEnum
from sqlalchemy.sql import func
from app.core.database import Base
import uuid
import enum


class ResponseStatus(enum.Enum):
    """GEO response status"""
    SUCCESS = "success"
    FAILED = "failed"
    PARTIAL = "partial"


class GEOResponse(Base):
    """GEO AI responses - linked to prompts and entities"""
    __tablename__ = "geo_responses"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    geo_prompt_id = Column(String(36), ForeignKey("geo_prompts.id", ondelete="CASCADE"), nullable=False, index=True)
    business_profile_id = Column(String(36), ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Request data
    input_data = Column(Text)  # JSON - the actual data sent to LLM
    
    # Response data
    response_text = Column(Text)  # Raw LLM response
    parsed_response = Column(Text)  # JSON - structured response
    
    # Metadata
    status = Column(SQLEnum(ResponseStatus), default=ResponseStatus.SUCCESS, nullable=False)
    error_message = Column(Text)
    
    # Usage metrics
    tokens_used = Column(Integer)
    execution_time_ms = Column(Integer)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<GEOResponse(id={self.id}, status={self.status})>"
