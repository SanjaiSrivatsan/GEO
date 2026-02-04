from sqlalchemy import Column, String, DateTime, Integer, Numeric, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import uuid
from decimal import Decimal


class GeoScore(Base):
    """
    GEO Scoring Engine - Step 16
    Deterministic, explainable scoring based on prompt execution results.
    
    Formula: GEO_SCORE = (Presence × 0.35) + (Accuracy × 0.35) + (Trust × 0.20) + HallucinationPenalty
    
    All scores are on a 0-100 scale except hallucination_penalty (-10 to 0).
    """
    __tablename__ = "geo_scores"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_profile_id = Column(String(36), ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Core score components (0-100 scale)
    presence_score = Column(Numeric(5, 2), nullable=False, default=0.00)
    accuracy_score = Column(Numeric(5, 2), nullable=False, default=0.00)
    trust_score = Column(Numeric(5, 2), nullable=False, default=0.00)
    hallucination_penalty = Column(Numeric(5, 2), nullable=False, default=0.00)  # -10 to 0
    
    # Final GEO score (calculated)
    final_geo_score = Column(Numeric(5, 2), nullable=False, default=0.00)
    
    # Detailed breakdowns (JSON) for transparency and explainability
    presence_breakdown = Column(JSON)
    accuracy_breakdown = Column(JSON)
    trust_breakdown = Column(JSON)
    hallucination_breakdown = Column(JSON)
    
    # Computation metadata
    prompt_results_count = Column(Integer, nullable=False, default=0)
    computation_method = Column(String(50), default='v1.0')
    computed_at = Column(DateTime(timezone=False), nullable=False, default=func.now())
    
    # Audit fields
    created_at = Column(DateTime(timezone=False), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    business_profile = relationship("BusinessProfile", back_populates="geo_scores")
    user = relationship("User", back_populates="geo_scores")
    
    def __repr__(self):
        return f"<GeoScore(id={self.id}, business_id={self.business_profile_id}, final_score={self.final_geo_score})>"
    
    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            "id": self.id,
            "business_profile_id": self.business_profile_id,
            "user_id": self.user_id,
            "presence_score": float(self.presence_score) if self.presence_score else 0.0,
            "accuracy_score": float(self.accuracy_score) if self.accuracy_score else 0.0,
            "trust_score": float(self.trust_score) if self.trust_score else 0.0,
            "hallucination_penalty": float(self.hallucination_penalty) if self.hallucination_penalty else 0.0,
            "final_geo_score": float(self.final_geo_score) if self.final_geo_score else 0.0,
            "presence_breakdown": self.presence_breakdown,
            "accuracy_breakdown": self.accuracy_breakdown,
            "trust_breakdown": self.trust_breakdown,
            "hallucination_breakdown": self.hallucination_breakdown,
            "prompt_results_count": self.prompt_results_count,
            "computation_method": self.computation_method,
            "computed_at": self.computed_at.isoformat() if self.computed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
