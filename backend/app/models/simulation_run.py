"""
Simulation Run Model
====================
Tracks batch prompt simulation runs with mention detection per prompt.
"""
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, JSON, Numeric
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


class SimulationRun(Base):
    """A single prompt simulation run with aggregated results."""
    __tablename__ = "simulation_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_profile_id = Column(
        String(36),
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Run config
    run_type = Column(String(20), nullable=False, default="full")  # full | selective | rerun
    config_overrides = Column(JSON, nullable=True)  # temperature, max_tokens, etc.

    # Aggregate results
    total_prompts = Column(Integer, nullable=False, default=0)
    mentioned_count = Column(Integer, nullable=False, default=0)
    not_mentioned_count = Column(Integer, nullable=False, default=0)
    avg_confidence = Column(Numeric(4, 3), nullable=True)
    total_duration_ms = Column(Integer, nullable=False, default=0)

    # Per-prompt snapshot
    prompt_results_snapshot = Column(JSON, default=list)
    # [{"prompt_id": "...", "mentioned": true, "confidence": 0.85, "duration_ms": 1200}, ...]

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self):
        return f"<SimulationRun(id={self.id}, type={self.run_type}, mentioned={self.mentioned_count}/{self.total_prompts})>"

    def to_dict(self):
        return {
            "id": self.id,
            "business_profile_id": self.business_profile_id,
            "user_id": self.user_id,
            "run_type": self.run_type,
            "config_overrides": self.config_overrides,
            "total_prompts": self.total_prompts,
            "mentioned_count": self.mentioned_count,
            "not_mentioned_count": self.not_mentioned_count,
            "avg_confidence": float(self.avg_confidence) if self.avg_confidence else None,
            "total_duration_ms": self.total_duration_ms,
            "prompt_results_snapshot": self.prompt_results_snapshot or [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }
