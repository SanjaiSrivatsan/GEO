"""
Crawl API routes
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.business_profile import BusinessProfile
from app.services.crawler_service import CrawlerService
from pydantic import BaseModel
from typing import List, Optional
import asyncio


router = APIRouter(prefix="/crawl", tags=["crawl"])


# Request/Response Models
class StartCrawlRequest(BaseModel):
    """Request to start crawling a business website"""
    entity_id: str


class StartCrawlResponse(BaseModel):
    """Response for crawl start request"""
    status: str
    message: str
    entity_id: str


class CrawlStatusResponse(BaseModel):
    """Response for crawl status request"""
    entity_id: str
    status: str
    started_at: Optional[str]
    completed_at: Optional[str]
    error: Optional[str]
    total_pages: int
    pages_in_db: int


class ContentItem(BaseModel):
    """Single content item"""
    id: str
    url: str
    page_type: str
    title: str
    meta_description: str
    h1_tags: List[str]
    h2_tags: List[str]
    cleaned_text: str
    word_count: int
    extracted_name: Optional[str]
    extracted_address: Optional[str]
    extracted_phone: Optional[str]
    crawled_at: Optional[str]


class CrawlContentResponse(BaseModel):
    """Response for crawl content request"""
    entity_id: str
    total_pages: int
    content: List[ContentItem]


# Background task function
async def run_crawl_in_background(business_profile_id: str, db_session_maker):
    """
    Run crawl in background
    
    Args:
        business_profile_id: ID of the business profile
        db_session_maker: Database session maker
    """
    # Create new database session for background task
    db = db_session_maker()
    try:
        await CrawlerService.start_crawl(db=db, business_profile_id=business_profile_id)
    except Exception as e:
        print(f"Background crawl error: {e}")
    finally:
        db.close()


@router.post("/start", response_model=StartCrawlResponse, status_code=status.HTTP_202_ACCEPTED)
async def start_crawl(
    request: StartCrawlRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Start website crawl for a business entity
    
    - Validates that the entity exists and belongs to the current user
    - Starts crawl in background
    - Returns immediately with 202 Accepted
    """
    # Verify business profile exists and belongs to user
    business_profile = db.query(BusinessProfile).filter(
        BusinessProfile.id == request.entity_id,
        BusinessProfile.user_id == current_user.id
    ).first()
    
    if not business_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business profile not found or does not belong to you"
        )
    
    if not business_profile.website:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Business profile has no website URL"
        )
    
    # Check if crawl already in progress
    if business_profile.crawl_status.value == "in_progress":
        return StartCrawlResponse(
            status="already_in_progress",
            message="Crawl is already in progress for this business",
            entity_id=request.entity_id
        )
    
    # Start crawl in background
    # We need to pass a way to create new DB session for background task
    from app.core.database import SessionLocal
    background_tasks.add_task(
        run_crawl_in_background,
        business_profile_id=request.entity_id,
        db_session_maker=SessionLocal
    )
    
    return StartCrawlResponse(
        status="started",
        message="Website crawl started in background",
        entity_id=request.entity_id
    )


@router.get("/status/{entity_id}", response_model=CrawlStatusResponse)
def get_crawl_status(
    entity_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get crawl status for a business entity
    
    - Returns current crawl status (not_started, pending, in_progress, completed, failed)
    - Returns page counts and timestamps
    """
    # Verify business profile exists and belongs to user
    business_profile = db.query(BusinessProfile).filter(
        BusinessProfile.id == entity_id,
        BusinessProfile.user_id == current_user.id
    ).first()
    
    if not business_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business profile not found or does not belong to you"
        )
    
    try:
        status_data = CrawlerService.get_crawl_status(db=db, business_profile_id=entity_id)
        
        return CrawlStatusResponse(
            entity_id=entity_id,
            **status_data
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/content/{entity_id}", response_model=CrawlContentResponse)
def get_crawl_content(
    entity_id: str,
    page_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get crawled content for a business entity
    
    - Returns all crawled pages
    - Optionally filter by page_type (homepage, about, services, contact, etc.)
    - Content is sorted by page type priority
    """
    # Verify business profile exists and belongs to user
    business_profile = db.query(BusinessProfile).filter(
        BusinessProfile.id == entity_id,
        BusinessProfile.user_id == current_user.id
    ).first()
    
    if not business_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business profile not found or does not belong to you"
        )
    
    try:
        content_data = CrawlerService.get_crawled_content(
            db=db,
            business_profile_id=entity_id,
            page_type=page_type
        )
        
        return CrawlContentResponse(
            entity_id=entity_id,
            total_pages=len(content_data),
            content=content_data
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
