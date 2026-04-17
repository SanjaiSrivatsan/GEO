"""
Canonical Entity Model
======================
The backbone of the GEO Intelligence Engine.
Stores the synthesized, normalized view of how AI sees a business.
Built from prompt results, website content, and mention data.
"""
from sqlalchemy import Column, String, DateTime, Text, Integer, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid


class CanonicalEntity(Base):
    """
    Canonical representation of a business entity as understood by AI.
    One per business profile, versioned — rebuilt on each analysis pass.
    """
    __tablename__ = "canonical_entities"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_profile_id = Column(
        String(36),
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Core identity
    primary_category = Column(String(255), nullable=False)
    secondary_categories = Column(JSON, default=list)  # ["bakery", "cafe", ...]

    # Service catalog
    services = Column(JSON, default=list)
    # [{"name": "...", "description": "...", "confidence": 0.92, "source_url": "..."}, ...]

    # Positioning
    positioning_statement = Column(Text)

    # Ideal Customer Profile
    icp = Column(JSON, default=dict)
    # {"segments": [], "industries": [], "company_sizes": [], "pain_points": []}

    # Geographic scope
    geo_scope = Column(JSON, default=dict)
    # {"primary_location": "...", "service_areas": [], "radius_km": null}

    # Vocabulary
    approved_terms = Column(JSON, default=list)   # ["web development", "responsive design", ...]
    vocabulary_clusters = Column(JSON, default=list)
    # [{"label": "web dev", "canonical": "web development", "variants": ["web dev", "website development"], "frequency": 12}]

    # Raw signal archive (full LLM outputs used for synthesis — for audit)
    raw_signals = Column(JSON, default=dict)

    # Versioning
    version = Column(Integer, nullable=False, default=1)

    # Timestamps
    computed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    business_profile = relationship("BusinessProfile", backref="canonical_entity", uselist=False)
    gap_issues = relationship("GapIssue", back_populates="canonical_entity", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<CanonicalEntity(id={self.id}, biz={self.business_profile_id}, v{self.version})>"

    def to_dict(self):
        return {
            "id": self.id,
            "business_profile_id": self.business_profile_id,
            "primary_category": self.primary_category,
            "secondary_categories": self.secondary_categories or [],
            "services": self.services or [],
            "positioning_statement": self.positioning_statement,
            "icp": self.icp or {},
            "geo_scope": self.geo_scope or {},
            "approved_terms": self.approved_terms or [],
            "vocabulary_clusters": self.vocabulary_clusters or [],
            "version": self.version,
            "computed_at": self.computed_at.isoformat() if self.computed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
