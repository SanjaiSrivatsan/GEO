"""
Crawler service layer
Orchestrates website crawling using hybrid approach (Scrapy + Playwright fallback)
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.business_profile import BusinessProfile, CrawlStatus
from app.models.website_content import WebsiteContent
from app.crawlers.playwright_crawler import run_playwright_crawler
from datetime import datetime
from typing import List, Dict, Optional
from loguru import logger
import asyncio
import json
from urllib.parse import urlparse


class CrawlerService:
    """Service for managing website crawling operations"""
    
    @staticmethod
    async def start_crawl(db: Session, business_profile_id: str) -> Dict:
        """
        Start website crawl for a business profile
        
        Args:
            db: Database session
            business_profile_id: ID of the business profile
            
        Returns:
            Dictionary with crawl start status
            
        Raises:
            ValueError: If business profile not found or has no website
        """
        # Get business profile
        business_profile = db.query(BusinessProfile).filter(
            BusinessProfile.id == business_profile_id
        ).first()
        
        if not business_profile:
            raise ValueError("Business profile not found")
        
        if not business_profile.website:
            raise ValueError("Business profile has no website URL")
        
        # Check if crawl already in progress
        if business_profile.crawl_status == CrawlStatus.IN_PROGRESS:
            return {
                "status": "already_in_progress",
                "message": "Crawl is already in progress for this business profile"
            }
        
        # Update crawl status to IN_PROGRESS
        business_profile.crawl_status = CrawlStatus.IN_PROGRESS
        business_profile.crawl_started_at = datetime.utcnow()
        business_profile.crawl_error = None
        db.commit()
        
        logger.info(f"Starting crawl for business profile {business_profile_id}: {business_profile.website}")
        
        try:
            # Use Playwright crawler (works for all sites including JS-heavy)
            pages_data = await run_playwright_crawler(
                start_url=business_profile.website,
                max_pages=30,
                max_depth=2
            )
            
            # Check if we got enough content
            if not pages_data or len(pages_data) == 0:
                raise Exception("No pages were successfully crawled")
            
            # Store extracted content in database
            stored_count = CrawlerService._store_crawled_content(
                db=db,
                business_profile_id=business_profile_id,
                pages_data=pages_data
            )
            
            # Update business profile with success status
            business_profile.crawl_status = CrawlStatus.COMPLETED
            business_profile.crawl_completed_at = datetime.utcnow()
            business_profile.total_pages_crawled = str(stored_count)
            db.commit()
            
            logger.info(f"Crawl completed for business profile {business_profile_id}: {stored_count} pages")
            
            return {
                "status": "completed",
                "message": f"Successfully crawled {stored_count} pages",
                "pages_crawled": stored_count
            }
        
        except Exception as e:
            logger.error(f"Crawl failed for business profile {business_profile_id}: {e}")
            
            # Update business profile with failed status
            business_profile.crawl_status = CrawlStatus.FAILED
            business_profile.crawl_error = str(e)
            business_profile.crawl_completed_at = datetime.utcnow()
            db.commit()
            
            return {
                "status": "failed",
                "message": f"Crawl failed: {str(e)}",
                "error": str(e)
            }
    
    @staticmethod
    def _store_crawled_content(
        db: Session,
        business_profile_id: str,
        pages_data: List[Dict]
    ) -> int:
        """
        Store crawled content in database
        
        Args:
            db: Database session
            business_profile_id: ID of the business profile
            pages_data: List of page data dictionaries
            
        Returns:
            Number of pages stored
        """
        stored_count = 0
        
        for page_data in pages_data:
            try:
                # Create WebsiteContent record
                content = WebsiteContent(
                    business_profile_id=business_profile_id,
                    url=page_data.get('url', ''),
                    page_type=page_data.get('page_type', 'other'),
                    raw_html=page_data.get('raw_html', ''),
                    cleaned_text=page_data.get('cleaned_text', ''),
                    title=page_data.get('title', ''),
                    meta_description=page_data.get('meta_description', ''),
                    h1_tags=json.dumps(page_data.get('h1_tags', [])),
                    h2_tags=json.dumps(page_data.get('h2_tags', [])),
                    extracted_name=page_data.get('extracted_name'),
                    extracted_address=page_data.get('extracted_address'),
                    extracted_phone=page_data.get('extracted_phone'),
                    word_count=page_data.get('word_count', 0),
                    crawled_at=datetime.utcnow()
                )
                
                db.add(content)
                stored_count += 1
            
            except Exception as e:
                logger.error(f"Error storing page content for {page_data.get('url')}: {e}")
                continue
        
        # Commit all content records
        db.commit()
        
        return stored_count
    
    @staticmethod
    def get_crawl_status(db: Session, business_profile_id: str) -> Dict:
        """
        Get crawl status for a business profile
        
        Args:
            db: Database session
            business_profile_id: ID of the business profile
            
        Returns:
            Dictionary with crawl status information
            
        Raises:
            ValueError: If business profile not found
        """
        # Get business profile
        business_profile = db.query(BusinessProfile).filter(
            BusinessProfile.id == business_profile_id
        ).first()
        
        if not business_profile:
            raise ValueError("Business profile not found")
        
        # Get page count
        page_count = db.query(func.count(WebsiteContent.id)).filter(
            WebsiteContent.business_profile_id == business_profile_id
        ).scalar()
        
        return {
            "status": business_profile.crawl_status.value,
            "started_at": business_profile.crawl_started_at.isoformat() if business_profile.crawl_started_at else None,
            "completed_at": business_profile.crawl_completed_at.isoformat() if business_profile.crawl_completed_at else None,
            "error": business_profile.crawl_error,
            "total_pages": int(business_profile.total_pages_crawled or "0"),
            "pages_in_db": page_count
        }
    
    @staticmethod
    def get_crawled_content(
        db: Session,
        business_profile_id: str,
        page_type: Optional[str] = None
    ) -> List[Dict]:
        """
        Get crawled content for a business profile
        
        Args:
            db: Database session
            business_profile_id: ID of the business profile
            page_type: Optional filter by page type (homepage, about, services, etc.)
            
        Returns:
            List of content dictionaries
            
        Raises:
            ValueError: If business profile not found
        """
        # Get business profile
        business_profile = db.query(BusinessProfile).filter(
            BusinessProfile.id == business_profile_id
        ).first()
        
        if not business_profile:
            raise ValueError("Business profile not found")
        
        # Build query
        query = db.query(WebsiteContent).filter(
            WebsiteContent.business_profile_id == business_profile_id
        )
        
        # Filter by page type if specified
        if page_type:
            query = query.filter(WebsiteContent.page_type == page_type)
        
        # Order by page type priority
        type_priority = {
            'homepage': 1,
            'about': 2,
            'services': 3,
            'products': 4,
            'contact': 5,
            'faq': 6,
            'other': 7
        }
        
        contents = query.all()
        
        # Sort by priority
        sorted_contents = sorted(
            contents,
            key=lambda x: type_priority.get(x.page_type, 999)
        )
        
        # Convert to dictionaries
        result = []
        for content in sorted_contents:
            result.append({
                "id": content.id,
                "url": content.url,
                "page_type": content.page_type,
                "title": content.title,
                "meta_description": content.meta_description,
                "h1_tags": json.loads(content.h1_tags) if content.h1_tags else [],
                "h2_tags": json.loads(content.h2_tags) if content.h2_tags else [],
                "cleaned_text": content.cleaned_text,
                "word_count": content.word_count,
                "extracted_name": content.extracted_name,
                "extracted_address": content.extracted_address,
                "extracted_phone": content.extracted_phone,
                "crawled_at": content.crawled_at.isoformat() if content.crawled_at else None
            })
        
        return result
