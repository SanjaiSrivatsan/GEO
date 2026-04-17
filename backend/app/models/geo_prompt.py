"""
GEO Prompt Models
Database models for GEO prompt library and execution results
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum as SQLEnum, Integer, Numeric, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime
import enum


class PromptCategory(enum.Enum):
    """GEO Prompt Categories"""
    ENTITY_DEFINITION = "entity_definition"
    CATEGORY_VISIBILITY = "category_visibility"
    COMPARISON_ALTERNATIVES = "comparison_alternatives"
    TRUST_REVIEWS = "trust_reviews"
    LOCAL_DISCOVERY = "local_discovery"


class ExecutionStatus(enum.Enum):
    """Execution status for prompt results"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"


class GeoPrompt(Base):
    """
    GEO Prompt Library
    
    Stores versioned, structured prompts for GEO analysis.
    Each prompt has a defined category, expected output schema, and scoring weight.
    """
    __tablename__ = "geo_prompts"
    
    # Primary Key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Prompt Identification
    prompt_id = Column(String(100), unique=True, nullable=False, index=True)  # e.g., "entity_def_001"
    version = Column(String(20), nullable=False, default="1.0")
    
    # Classification
    category = Column(SQLEnum(PromptCategory, values_callable=lambda x: [e.value for e in x]), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Prompt Content
    prompt_text = Column(Text, nullable=False)
    system_message = Column(Text, nullable=True)  # Optional system message for LLM
    
    # Execution Configuration
    temperature = Column(Numeric(3, 2), nullable=False, default=0.2)  # Low temperature for deterministic outputs
    max_tokens = Column(Integer, nullable=True, default=500)
    
    # Output Configuration
    expected_output_schema = Column(JSON, nullable=False)  # JSON schema for structured output
    scoring_weight = Column(Numeric(3, 2), nullable=False, default=1.0)  # Weight for final scoring (0-1)
    
    # Metadata
    is_active = Column(String(10), nullable=False, default="true")  # "true" or "false" as string
    execution_order = Column(Integer, nullable=False, default=0)  # Order within category
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    results = relationship("GeoPromptResult", back_populates="prompt", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<GeoPrompt(prompt_id={self.prompt_id}, category={self.category.value})>"


class GeoPromptResult(Base):
    """
    GEO Prompt Execution Results
    
    Stores results from executing GEO prompts against business data.
    Includes raw response, structured response, confidence, and citations.
    """
    __tablename__ = "geo_prompt_results"
    
    # Primary Key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Foreign Keys
    prompt_id = Column(String(36), ForeignKey("geo_prompts.id"), nullable=False, index=True)
    business_profile_id = Column(String(36), ForeignKey("business_profiles.id"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    
    # Execution Metadata
    execution_status = Column(SQLEnum(ExecutionStatus, values_callable=lambda x: [e.value for e in x]), nullable=False, default=ExecutionStatus.PENDING, index=True)
    execution_timestamp = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    execution_duration_ms = Column(Integer, nullable=True)  # Execution time in milliseconds
    
    # Model Information
    model_name = Column(String(100), nullable=True)  # e.g., "gpt-4", "gpt-3.5-turbo"
    model_version = Column(String(50), nullable=True)
    
    # Responses
    raw_response = Column(Text, nullable=True)  # Raw LLM output
    structured_response = Column(JSON, nullable=True)  # Parsed JSON response matching schema
    
    # Quality Metrics
    confidence_score = Column(Numeric(4, 3), nullable=True)  # 0.000 - 1.000
    validation_passed = Column(String(10), nullable=True, default="true")  # "true" or "false"
    validation_errors = Column(JSON, nullable=True)  # Schema validation errors
    
    # Citations & Sources
    cited_sources = Column(JSON, nullable=True)  # Array of source references
    # Format: [{"type": "website", "id": "page-uuid", "url": "..."}, {"type": "review", "id": "review-uuid"}, ...]
    
    # Error Handling
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, nullable=False, default=0)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    prompt = relationship("GeoPrompt", back_populates="results")
    business_profile = relationship("BusinessProfile")
    user = relationship("User")
    
    def __repr__(self):
        return f"<GeoPromptResult(id={self.id}, status={self.execution_status.value})>"
