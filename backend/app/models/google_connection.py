from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


class GoogleConnection(Base):
    """Google OAuth connection and tokens"""
    __tablename__ = "google_connections"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    # OAuth data
    connected_email = Column(String(255), nullable=False)
    access_token = Column(Text, nullable=False)  # Encrypted in production
    refresh_token = Column(Text, nullable=False)  # Encrypted in production
    token_expires_at = Column(DateTime(timezone=True), nullable=False)
    
    # Connection status
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    connected_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_synced_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<GoogleConnection(id={self.id}, email={self.connected_email}, active={self.is_active})>"
