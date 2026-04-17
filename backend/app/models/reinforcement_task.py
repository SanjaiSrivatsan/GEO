"""
Reinforcement Task Model
=========================
Action tasks generated from detected gaps.
Bridges detection → execution.
"""
from sqlalchemy import Column, String, DateTime, Text, Integer, ForeignKey, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
import enum


class TaskImpact(enum.Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class TaskStatus(enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"


class ReinforcementTask(Base):
    """A concrete action task generated from a gap issue."""
    __tablename__ = "reinforcement_tasks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    gap_issue_id = Column(
        String(36),
        ForeignKey("gap_issues.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    business_profile_id = Column(
        String(36),
        ForeignKey("business_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Task content
    action_type = Column(String(100), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    implementation_hint = Column(Text)

    # Priority
    impact = Column(
        SQLEnum(TaskImpact, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=TaskImpact.MEDIUM,
    )
    priority_order = Column(Integer, nullable=False, default=0)

    # Lifecycle
    status = Column(
        SQLEnum(TaskStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=TaskStatus.PENDING,
        index=True,
    )

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    gap_issue = relationship("GapIssue", back_populates="reinforcement_tasks")

    def __repr__(self):
        return f"<ReinforcementTask(id={self.id}, action={self.action_type}, impact={self.impact.value})>"

    def to_dict(self):
        return {
            "id": self.id,
            "gap_issue_id": self.gap_issue_id,
            "business_profile_id": self.business_profile_id,
            "action_type": self.action_type,
            "title": self.title,
            "description": self.description,
            "implementation_hint": self.implementation_hint,
            "impact": self.impact.value,
            "priority_order": self.priority_order,
            "status": self.status.value,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
