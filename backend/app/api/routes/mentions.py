"""
Brand Mention Discovery API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.brand_mention import MentionType, SentimentType, MentionStatus
from app.services.mention_discovery_service import MentionDiscoveryService
from pydantic import BaseModel
from typing import List, Optional
from loguru import logger


router = APIRouter(prefix="/mentions", tags=["Brand Mentions"])


# Request/Response Models
class StartDiscoveryRequest(BaseModel):
    entity_id: str
    use_google: bool = True
    use_bing: bool = True
    use_duckduckgo: bool = True
    max_results_per_query: int = 10


class DiscoveryStatusResponse(BaseModel):
    status: str
    queries_executed: int
    results_scraped: int
    new_mentions: int
    updated_mentions: int
    skipped_duplicates: int
    total_mentions: int
    engines_used: List[str] = []
    sentiment_engine: str = "rule_based"


class MentionItem(BaseModel):
    id: str
    source_url: str
    source_domain: str
    page_title: Optional[str] = None
    extracted_snippet: Optional[str] = None
    mention_type: str
    sentiment: str
    status: str
    search_query: Optional[str] = None
    search_position: Optional[str] = None
    discovery_method: Optional[str] = None
    discovered_at: str
    
    class Config:
        from_attributes = True


class MentionsListResponse(BaseModel):
    entity_id: str
    total: int
    mentions: List[MentionItem]


class MentionStatsResponse(BaseModel):
    total_mentions: int
    by_type: dict
    by_sentiment: dict
    by_status: dict
    top_domains: List[dict]


# Background task for discovery
async def run_discovery_task(
    db: Session,
    business_profile_id: str,
    user_id: str,
    use_google: bool,
    use_bing: bool,
    max_results_per_query: int
):
    """Background task to run mention discovery"""
    try:
        await MentionDiscoveryService.discover_mentions(
            db=db,
            business_profile_id=business_profile_id,
            user_id=user_id,
            use_google=use_google,
            use_bing=use_bing,
            max_results_per_query=max_results_per_query
        )
    except Exception as e:
        logger.error(f"Error in discovery background task: {e}")


# API Endpoints
@router.post("/discover", response_model=DiscoveryStatusResponse, status_code=status.HTTP_202_ACCEPTED)
async def start_discovery(
    request: StartDiscoveryRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Start brand mention discovery for a business entity
    
    Discovers mentions by:
    1. Generating search queries (brand + category, brand + location, etc.)
    2. Scraping Google and/or Bing search results
    3. De-duplicating by URL
    4. Extracting and storing mention data
    """
    try:
        # Validate business profile ownership
        from app.models.business_profile import BusinessProfile
        profile = db.query(BusinessProfile).filter(
            BusinessProfile.id == request.entity_id,
            BusinessProfile.user_id == current_user.id
        ).first()
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Business profile not found or you don't have access"
            )
        
        # Run discovery (blocking for now, can be made async)
        result = await MentionDiscoveryService.discover_mentions(
            db=db,
            business_profile_id=request.entity_id,
            user_id=current_user.id,
            use_google=request.use_google,
            use_bing=request.use_bing,
            use_duckduckgo=request.use_duckduckgo,
            max_results_per_query=request.max_results_per_query
        )
        
        logger.info(f"Mention discovery started for entity {request.entity_id}")
        
        return DiscoveryStatusResponse(**result)
    
    except ValueError as e:
        logger.error(f"Validation error in mention discovery: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error in mention discovery: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start mention discovery: {str(e)}"
        )


@router.get("/{entity_id}", response_model=MentionsListResponse)
async def get_mentions(
    entity_id: str,
    mention_type: Optional[str] = Query(None, description="Filter by mention type"),
    sentiment: Optional[str] = Query(None, description="Filter by sentiment"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of results"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get brand mentions for a business entity
    
    Supports filtering by:
    - mention_type: directory, review, article, blog, comparison, social, other
    - sentiment: positive, neutral, negative, unknown
    - status: discovered, processed, ignored
    """
    try:
        # Validate business profile ownership
        from app.models.business_profile import BusinessProfile
        profile = db.query(BusinessProfile).filter(
            BusinessProfile.id == entity_id,
            BusinessProfile.user_id == current_user.id
        ).first()
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Business profile not found or you don't have access"
            )
        
        # Parse filters
        mention_type_enum = None
        if mention_type:
            try:
                mention_type_enum = MentionType(mention_type.lower())
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid mention_type: {mention_type}"
                )
        
        sentiment_enum = None
        if sentiment:
            try:
                sentiment_enum = SentimentType(sentiment.lower())
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid sentiment: {sentiment}"
                )
        
        status_enum = None
        if status_filter:
            try:
                status_enum = MentionStatus(status_filter.lower())
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status: {status_filter}"
                )
        
        # Get mentions
        mentions = MentionDiscoveryService.get_mentions(
            db=db,
            business_profile_id=entity_id,
            user_id=current_user.id,
            mention_type=mention_type_enum,
            sentiment=sentiment_enum,
            status=status_enum,
            limit=limit
        )
        
        # Convert to response format
        mention_items = []
        for mention in mentions:
            mention_items.append(MentionItem(
                id=mention.id,
                source_url=mention.source_url,
                source_domain=mention.source_domain,
                page_title=mention.page_title,
                extracted_snippet=mention.extracted_snippet,
                mention_type=mention.mention_type.value,
                sentiment=mention.sentiment.value,
                status=mention.status.value,
                search_query=mention.search_query,
                search_position=mention.search_position,
                discovery_method=mention.discovery_method,
                discovered_at=mention.discovered_at.isoformat() if mention.discovered_at else None
            ))
        
        logger.info(f"Retrieved {len(mention_items)} mentions for entity {entity_id}")
        
        return MentionsListResponse(
            entity_id=entity_id,
            total=len(mention_items),
            mentions=mention_items
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error getting mentions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve mentions: {str(e)}"
        )


@router.get("/{entity_id}/stats", response_model=MentionStatsResponse)
async def get_mention_stats(
    entity_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get statistics about brand mentions for a business entity
    """
    try:
        # Validate business profile ownership
        from app.models.business_profile import BusinessProfile
        from app.models.brand_mention import BrandMention
        from sqlalchemy import func
        
        profile = db.query(BusinessProfile).filter(
            BusinessProfile.id == entity_id,
            BusinessProfile.user_id == current_user.id
        ).first()
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Business profile not found or you don't have access"
            )
        
        # Total mentions
        total = db.query(BrandMention).filter(
            BrandMention.business_profile_id == entity_id
        ).count()
        
        # By type
        type_counts = db.query(
            BrandMention.mention_type,
            func.count(BrandMention.id)
        ).filter(
            BrandMention.business_profile_id == entity_id
        ).group_by(BrandMention.mention_type).all()
        
        by_type = {str(t[0].value): t[1] for t in type_counts}
        
        # By sentiment
        sentiment_counts = db.query(
            BrandMention.sentiment,
            func.count(BrandMention.id)
        ).filter(
            BrandMention.business_profile_id == entity_id
        ).group_by(BrandMention.sentiment).all()
        
        by_sentiment = {str(s[0].value): s[1] for s in sentiment_counts}
        
        # By status
        status_counts = db.query(
            BrandMention.status,
            func.count(BrandMention.id)
        ).filter(
            BrandMention.business_profile_id == entity_id
        ).group_by(BrandMention.status).all()
        
        by_status = {str(s[0].value): s[1] for s in status_counts}
        
        # Top domains
        domain_counts = db.query(
            BrandMention.source_domain,
            func.count(BrandMention.id).label('count')
        ).filter(
            BrandMention.business_profile_id == entity_id
        ).group_by(BrandMention.source_domain).order_by(func.count(BrandMention.id).desc()).limit(10).all()
        
        top_domains = [{'domain': d[0], 'count': d[1]} for d in domain_counts]
        
        return MentionStatsResponse(
            total_mentions=total,
            by_type=by_type,
            by_sentiment=by_sentiment,
            by_status=by_status,
            top_domains=top_domains
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error getting mention stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve mention statistics: {str(e)}"
        )
