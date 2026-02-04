"""
Google OAuth Service
Handles Google OAuth 2.0 flow for Google Business Profile API access
"""
from sqlalchemy.orm import Session
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
from app.models.google_connection import GoogleConnection
from app.models.user import User
from app.config import settings
from datetime import datetime, timedelta
from typing import Dict, Optional
from loguru import logger
import json


# Google OAuth scopes
GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/business.manage',  # Manage business locations
    'https://www.googleapis.com/auth/userinfo.email',   # Get user email
    'openid'                                             # OpenID Connect
]


class GoogleOAuthService:
    """Service for Google OAuth operations"""
    
    @staticmethod
    def get_authorization_url(state: str) -> str:
        """
        Generate Google OAuth authorization URL
        
        Args:
            state: Random state string for CSRF protection
            
        Returns:
            Authorization URL for user to visit
        """
        # Create OAuth flow
        flow = Flow.from_client_config(
            client_config={
                "web": {
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
                }
            },
            scopes=GOOGLE_SCOPES,
            redirect_uri=settings.GOOGLE_REDIRECT_URI
        )
        
        # Generate authorization URL
        authorization_url, _ = flow.authorization_url(
            access_type='offline',  # Request refresh token
            include_granted_scopes='true',
            state=state,
            prompt='consent'  # Force consent screen to get refresh token
        )
        
        logger.info(f"Generated OAuth URL with state: {state}")
        return authorization_url
    
    @staticmethod
    def exchange_code_for_tokens(
        code: str,
        db: Session,
        user: User
    ) -> Dict:
        """
        Exchange authorization code for access/refresh tokens
        
        Args:
            code: Authorization code from OAuth callback
            db: Database session
            user: Current user
            
        Returns:
            Dictionary with connection info
        """
        try:
            # Create OAuth flow
            flow = Flow.from_client_config(
                client_config={
                    "web": {
                        "client_id": settings.GOOGLE_CLIENT_ID,
                        "client_secret": settings.GOOGLE_CLIENT_SECRET,
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token",
                        "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
                    }
                },
                scopes=GOOGLE_SCOPES,
                redirect_uri=settings.GOOGLE_REDIRECT_URI
            )
            
            # Exchange code for tokens
            flow.fetch_token(code=code)
            credentials = flow.credentials
            
            # Get user info to get email
            from googleapiclient.discovery import build
            user_info_service = build('oauth2', 'v2', credentials=credentials)
            user_info = user_info_service.userinfo().get().execute()
            email = user_info.get('email', 'unknown@example.com')
            
            # Calculate token expiry
            token_expires_at = datetime.utcnow() + timedelta(seconds=credentials.expiry.timestamp() - datetime.utcnow().timestamp() if credentials.expiry else 3600)
            
            # Check if connection already exists
            existing_connection = db.query(GoogleConnection).filter(
                GoogleConnection.user_id == user.id
            ).first()
            
            if existing_connection:
                # Update existing connection
                existing_connection.connected_email = email
                existing_connection.access_token = credentials.token
                existing_connection.refresh_token = credentials.refresh_token or existing_connection.refresh_token
                existing_connection.token_expires_at = token_expires_at
                existing_connection.is_active = True
                existing_connection.connected_at = datetime.utcnow()
                db.commit()
                
                logger.info(f"Updated Google connection for user {user.id}")
                connection = existing_connection
            else:
                # Create new connection
                connection = GoogleConnection(
                    user_id=user.id,
                    connected_email=email,
                    access_token=credentials.token,
                    refresh_token=credentials.refresh_token,
                    token_expires_at=token_expires_at,
                    is_active=True
                )
                db.add(connection)
                db.commit()
                db.refresh(connection)
                
                logger.info(f"Created new Google connection for user {user.id}")
            
            return {
                "connection_id": connection.id,
                "email": email,
                "connected_at": connection.connected_at.isoformat(),
                "expires_at": token_expires_at.isoformat()
            }
        
        except Exception as e:
            logger.error(f"Error exchanging code for tokens: {e}")
            raise ValueError(f"Failed to connect Google account: {str(e)}")
    
    @staticmethod
    def get_credentials(db: Session, user_id: str) -> Optional[Credentials]:
        """
        Get valid Google credentials for a user
        Refreshes token if expired
        
        Args:
            db: Database session
            user_id: User ID
            
        Returns:
            Google credentials or None if not connected
        """
        connection = db.query(GoogleConnection).filter(
            GoogleConnection.user_id == user_id,
            GoogleConnection.is_active == True
        ).first()
        
        if not connection:
            return None
        
        # Create credentials object
        credentials = Credentials(
            token=connection.access_token,
            refresh_token=connection.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            scopes=GOOGLE_SCOPES
        )
        
        # Check if token is expired
        if connection.token_expires_at < datetime.utcnow():
            logger.info(f"Token expired for user {user_id}, refreshing...")
            
            try:
                # Refresh token
                credentials.refresh(Request())
                
                # Update connection with new token
                connection.access_token = credentials.token
                connection.token_expires_at = datetime.utcnow() + timedelta(seconds=3600)
                db.commit()
                
                logger.info(f"Token refreshed for user {user_id}")
            except Exception as e:
                logger.error(f"Error refreshing token: {e}")
                connection.is_active = False
                db.commit()
                return None
        
        return credentials
    
    @staticmethod
    def disconnect(db: Session, user_id: str) -> bool:
        """
        Disconnect Google account
        
        Args:
            db: Database session
            user_id: User ID
            
        Returns:
            True if disconnected successfully
        """
        connection = db.query(GoogleConnection).filter(
            GoogleConnection.user_id == user_id
        ).first()
        
        if connection:
            connection.is_active = False
            db.commit()
            logger.info(f"Disconnected Google account for user {user_id}")
            return True
        
        return False
    
    @staticmethod
    def get_connection_status(db: Session, user_id: str) -> Dict:
        """
        Get Google connection status
        
        Args:
            db: Database session
            user_id: User ID
            
        Returns:
            Connection status info
        """
        connection = db.query(GoogleConnection).filter(
            GoogleConnection.user_id == user_id
        ).first()
        
        if not connection:
            return {
                "connected": False,
                "email": None,
                "connected_at": None
            }
        
        return {
            "connected": connection.is_active,
            "email": connection.connected_email,
            "connected_at": connection.connected_at.isoformat() if connection.connected_at else None,
            "last_synced_at": connection.last_synced_at.isoformat() if connection.last_synced_at else None
        }
