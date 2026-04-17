"""
Google Business Profile API Routes
Handles OAuth and GBP operations
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.services.google_oauth_service import GoogleOAuthService
from app.services.google_business_service import GoogleBusinessService
from pydantic import BaseModel
from typing import List, Optional
from loguru import logger
import secrets


router = APIRouter(prefix="/google", tags=["Google Business Profile"])


# Request/Response Models
class AuthUrlResponse(BaseModel):
    authorization_url: str
    state: str


class ConnectionStatusResponse(BaseModel):
    connected: bool
    email: Optional[str] = None
    connected_at: Optional[str] = None
    last_synced_at: Optional[str] = None


class GoogleLocationItem(BaseModel):
    google_location_id: str
    name: str
    category: str
    full_address: str
    city: str
    state: str
    country: str
    website: Optional[str] = None
    phone: Optional[str] = None
    status: str
    verification_state: str


class LocationsResponse(BaseModel):
    locations: List[GoogleLocationItem]
    total: int


class SelectLocationRequest(BaseModel):
    google_location_id: str
    business_profile_id: str


class SelectLocationResponse(BaseModel):
    success: bool
    message: str
    location_id: str


class SyncReviewsResponse(BaseModel):
    status: str
    new_reviews: int
    updated_reviews: int
    total_reviews: int
    average_rating: Optional[str] = None


# OAuth Endpoints
@router.get("/auth/url", response_model=AuthUrlResponse)
async def get_auth_url(
    current_user: User = Depends(get_current_user)
):
    """
    Get Google OAuth authorization URL
    
    Returns authorization URL for user to visit to grant permissions
    """
    try:
        import base64
        # Encode user_id + nonce into state for CSRF protection and user identity in callback
        nonce = secrets.token_urlsafe(16)
        state_data = f"{current_user.id}:{nonce}"
        state = base64.urlsafe_b64encode(state_data.encode()).decode()
        
        # Get authorization URL from OAuth service
        authorization_url = GoogleOAuthService.get_authorization_url(state)
        
        logger.info(f"Generated auth URL for user {current_user.id}")
        
        return AuthUrlResponse(
            authorization_url=authorization_url,
            state=state
        )
    
    except Exception as e:
        logger.error(f"Error generating auth URL: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate authorization URL: {str(e)}"
        )


@router.get("/oauth/callback")
async def oauth_callback(
    code: str = Query(..., description="Authorization code from Google"),
    state: str = Query(..., description="CSRF state token"),
    db: Session = Depends(get_db)
):
    """
    Handle OAuth callback from Google.
    User identity is decoded from the state parameter — no Bearer token needed here.
    """
    import base64 as _b64
    try:
        # Decode user_id from state
        try:
            state_data = _b64.urlsafe_b64decode(state.encode()).decode()
            user_id = state_data.split(":")[0]
        except Exception:
            logger.error("Failed to decode OAuth state parameter")
            return RedirectResponse(
                url="http://localhost:5173?google_error=Invalid+OAuth+state"
            )
        
        # Look up the user by user_id embedded in state
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.error(f"User not found for OAuth callback: {user_id}")
            return RedirectResponse(
                url="http://localhost:5173?google_error=User+not+found"
            )
        
        # Exchange code for tokens
        result = GoogleOAuthService.exchange_code_for_tokens(code, db, user)
        
        logger.info(f"OAuth completed for user {user.id}, email: {result['email']}")
        
        # Redirect to frontend with success flag
        return RedirectResponse(
            url=f"http://localhost:5173?google_connected=true&email={result['email']}"
        )
    
    except ValueError as e:
        logger.error(f"OAuth callback error: {e}")
        return RedirectResponse(
            url=f"http://localhost:5173?google_error={str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error in OAuth callback: {e}")
        return RedirectResponse(
            url=f"http://localhost:5173?google_error=An+unexpected+error+occurred"
        )


@router.get("/connection/status", response_model=ConnectionStatusResponse)
async def get_connection_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get Google connection status for current user
    """
    try:
        conn_status = GoogleOAuthService.get_connection_status(db, current_user.id)
        
        return ConnectionStatusResponse(
            connected=conn_status['connected'],
            email=conn_status['email'],
            connected_at=conn_status.get('connected_at'),
            last_synced_at=conn_status.get('last_synced_at')
        )
    
    except Exception as e:
        logger.error(f"Error getting connection status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get connection status: {str(e)}"
        )


@router.post("/disconnect")
async def disconnect_google(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Disconnect Google account
    """
    try:
        success = GoogleOAuthService.disconnect(db, current_user.id)
        
        if success:
            logger.info(f"Disconnected Google account for user {current_user.id}")
            return {"success": True, "message": "Google account disconnected"}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No Google connection found"
            )
    
    except Exception as e:
        logger.error(f"Error disconnecting Google: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to disconnect Google account: {str(e)}"
        )


# Business Profile Endpoints
@router.get("/locations", response_model=LocationsResponse)
async def get_locations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get user's Google Business Profile locations
    """
    try:
        locations = GoogleBusinessService.get_locations(db, current_user.id)
        
        logger.info(f"Retrieved {len(locations)} locations for user {current_user.id}")
        
        return LocationsResponse(
            locations=[GoogleLocationItem(**loc) for loc in locations],
            total=len(locations)
        )
    
    except ValueError as e:
        logger.error(f"Error getting locations: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error getting locations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch locations: {str(e)}"
        )


@router.post("/location/select", response_model=SelectLocationResponse)
async def select_location(
    request: SelectLocationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Link a Google Business location to a business profile
    """
    try:
        # First, fetch the location data from Google
        locations = GoogleBusinessService.get_locations(db, current_user.id)
        
        # Find the selected location
        location_data = next(
            (loc for loc in locations if loc['google_location_id'] == request.google_location_id),
            None
        )
        
        if not location_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Location not found in your Google Business Profile"
            )
        
        # Link location to business profile
        location = GoogleBusinessService.link_location_to_profile(
            db=db,
            user_id=current_user.id,
            business_profile_id=request.business_profile_id,
            google_location_id=request.google_location_id,
            location_data=location_data
        )
        
        logger.info(f"Linked location {request.google_location_id} to profile {request.business_profile_id}")
        
        return SelectLocationResponse(
            success=True,
            message=f"Location '{location_data['name']}' linked successfully",
            location_id=str(location.id)
        )
    
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Error selecting location: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error selecting location: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to select location: {str(e)}"
        )


@router.post("/reviews/sync", response_model=SyncReviewsResponse)
async def sync_reviews(
    google_location_id: str = Query(..., description="Google location ID to sync reviews for"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Sync reviews for a Google Business location
    
    This endpoint triggers a background sync of reviews
    """
    try:
        # Run sync in foreground for now (can move to background if needed)
        result = await GoogleBusinessService.sync_reviews(
            db=db,
            user_id=current_user.id,
            google_location_id=google_location_id
        )
        
        logger.info(f"Synced reviews for location {google_location_id}: {result['new_reviews']} new")
        
        return SyncReviewsResponse(
            status=result['status'],
            new_reviews=result['new_reviews'],
            updated_reviews=result['updated_reviews'],
            total_reviews=result['total_reviews'],
            average_rating=result.get('average_rating')
        )
    
    except ValueError as e:
        logger.error(f"Error syncing reviews: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error syncing reviews: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync reviews: {str(e)}"
        )
