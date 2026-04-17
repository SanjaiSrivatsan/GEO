"""
Gap Issue Model
===============
Structured conflict/gap objects detected by the Gap Detection Engine.
Each issue has a type, severity, evidence, and links back to the canonical entity.
"""
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
import enum


class GapType(enum.Enum):
    """Types of gaps/conflicts the detection engine can find."""
    CATEGORY_MISMATCH = "category_mismatch"
    SERVICE_DRIFT = "service_drift"
    VERTICAL_ABSENCE = "vertical_absence"
    MISSING_FAQ = "missing_faq"
    WEAK_GEO_BINDING = "weak_geo_binding"
    INCONSISTENT_VOCABULARY = "inconsistent_vocabulary"


class GapSeverity(enum.Enum):
    """Severity levels for detected gaps."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class GapStatus(enum.Enum):
    """Lifecycle status of a gap issue."""
    ACTIVE = "active"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


class GapIssue(Base):
    """
    A detected gap or conflict in how a business is represented.
    Pure structured output — no UI logic.
    """
    __tablename__ = "gap_issues"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_profile_id = Column(
        String(36),
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    canonical_entity_id = Column(
        String(36),
        ForeignKey("canonical_entities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Classification
    gap_type = Column(
        SQLEnum(GapType, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        index=True,
    )
    severity = Column(
        SQLEnum(GapSeverity, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        index=True,
    )
    status = Column(
        SQLEnum(GapStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=GapStatus.ACTIVE,
        index=True,
    )

    # Detail
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)

    # Evidence / data points that triggered the detection
    evidence = Column(JSON, default=dict)
    # {"found": [...], "expected": [...], "pages_checked": [...]}

    # Which GEO score dimensions this gap impacts
    affected_dimensions = Column(JSON, default=list)
    # ["presence", "accuracy"]

    # Timestamps
    detected_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    canonical_entity = relationship("CanonicalEntity", back_populates="gap_issues")
    reinforcement_tasks = relationship("ReinforcementTask", back_populates="gap_issue", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<GapIssue(id={self.id}, type={self.gap_type.value}, severity={self.severity.value})>"

    def to_dict(self):
        return {
            "id": self.id,
            "business_profile_id": self.business_profile_id,
            "canonical_entity_id": self.canonical_entity_id,
            "gap_type": self.gap_type.value,
            "severity": self.severity.value,
            "status": self.status.value,
            "title": self.title,
            "description": self.description,
            "evidence": self.evidence or {},
            "affected_dimensions": self.affected_dimensions or [],
            "detected_at": self.detected_at.isoformat() if self.detected_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
        }
