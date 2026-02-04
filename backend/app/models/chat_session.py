from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.sql import func
from app.core.database import Base
import uuid
import enum


class SessionStatus(str, enum.Enum):
    ACTIVE = "active"
    ENDED = "ended"
    ARCHIVED = "archived"


class ChatSession(Base):
    """Chat session for GEO chatbot"""
    __tablename__ = "chat_sessions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    business_profile_id = Column(String(36), ForeignKey("business_profiles.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Session metadata
    title = Column(String(255), nullable=True)  # Auto-generated from first message
    status = Column(SQLEnum(SessionStatus), default=SessionStatus.ACTIVE, nullable=False)
    
    # Context tracking
    context_data = Column(Text)  # JSON - conversation context, preferences, state
    message_count = Column(String(10), default="0", nullable=False)
    
    # Timestamps
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_message_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<ChatSession(id={self.id}, user_id={self.user_id}, status={self.status})>"


class ChatMessage(Base):
    """Individual chat messages within a session"""
    __tablename__ = "chat_messages"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    chat_session_id = Column(String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Message data
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    
    # LangChain metadata
    prompt_used = Column(String(100), nullable=True)  # Reference to geo_prompts.name
    tokens_used = Column(String(10), nullable=True)
    execution_time_ms = Column(String(10), nullable=True)
    
    # Context at time of message
    context_snapshot = Column(Text)  # JSON - relevant data at message time
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<ChatMessage(id={self.id}, role={self.role})>"
