"""
Reasoning Analysis Model
=========================
Stores root-cause analysis for non-mentions.
The moat layer — explains WHY a business was not mentioned.
"""
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, JSON, Numeric, Enum as SQLEnum
from sqlalchemy.sql import func
from app.core.database import Base
import uuid
import enum


class ReinforcementClass(enum.Enum):
    """Root-cause categories for non-mentions."""
    AUTHORITY_GAP = "authority_gap"
    RELEVANCE_GAP = "relevance_gap"
    VISIBILITY_GAP = "visibility_gap"
    CONTENT_GAP = "content_gap"
    GEOGRAPHIC_GAP = "geographic_gap"


class ReasoningAnalysis(Base):
    """Root-cause analysis for a single non-mention prompt."""
    __tablename__ = "reasoning_analyses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_profile_id = Column(
        String(36),
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    simulation_run_id = Column(
        String(36),
        ForeignKey("simulation_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Which prompt
    prompt_id = Column(String(100), nullable=False, index=True)

    # Analysis
    root_cause = Column(Text, nullable=False)
    missing_signals = Column(JSON, default=list)
    # [{"signal_type": "trust", "description": "No certifications found", "severity": "high"}, ...]

    reinforcement_class = Column(
        SQLEnum(ReinforcementClass, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        index=True,
    )
    suggested_actions = Column(JSON, default=list)
    # ["Add industry certifications page", "Get more directory listings", ...]

    confidence = Column(Numeric(4, 3), nullable=True)

    # Timestamps
    analyzed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<ReasoningAnalysis(prompt={self.prompt_id}, class={self.reinforcement_class.value})>"

    def to_dict(self):
        return {
            "id": self.id,
            "business_profile_id": self.business_profile_id,
            "simulation_run_id": self.simulation_run_id,
            "prompt_id": self.prompt_id,
            "root_cause": self.root_cause,
            "missing_signals": self.missing_signals or [],
            "reinforcement_class": self.reinforcement_class.value,
            "suggested_actions": self.suggested_actions or [],
            "confidence": float(self.confidence) if self.confidence else None,
            "analyzed_at": self.analyzed_at.isoformat() if self.analyzed_at else None,
        }
