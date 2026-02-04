"""
Google Business Profile Service
Handles Google Business Profile API operations for locations and reviews
"""
from sqlalchemy.orm import Session
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from app.models.google_location import GoogleLocation, LocationStatus
from app.models.google_review import GoogleReview, SentimentLabel
from app.models.business_profile import BusinessProfile
from app.services.google_oauth_service import GoogleOAuthService
from datetime import datetime
from typing import List, Dict, Optional
from loguru import logger
import re


class GoogleBusinessService:
    """Service for Google Business Profile operations"""
    
    @staticmethod
    def get_locations(db: Session, user_id: str) -> List[Dict]:
        """
        Fetch user's Google Business Profile locations
        
        Args:
            db: Database session
            user_id: User ID
            
        Returns:
            List of location dictionaries
        """
        # Get credentials
        credentials = GoogleOAuthService.get_credentials(db, user_id)
        if not credentials:
            raise ValueError("Google account not connected or token expired")
        
        try:
            # Build My Business API service
            service = build('mybusinessbusinessinformation', 'v1', credentials=credentials)
            
            # List accounts
            accounts_response = service.accounts().list().execute()
            accounts = accounts_response.get('accounts', [])
            
            if not accounts:
                logger.warning(f"No Google Business accounts found for user {user_id}")
                return []
            
            # Get first account (most users have only one)
            account = accounts[0]
            account_name = account['name']  # e.g., "accounts/123456789"
            
            # List locations for account
            locations_response = service.accounts().locations().list(
                parent=account_name,
                readMask='name,title,categories,storefrontAddress,phoneNumbers,websiteUri,metadata'
            ).execute()
            
            locations = locations_response.get('locations', [])
            
            logger.info(f"Found {len(locations)} locations for user {user_id}")
            
            # Transform to our format
            result = []
            for location in locations:
                # Extract location details
                location_name = location.get('name', '')  # e.g., "locations/12345"
                title = location.get('title', 'Unnamed Location')
                
                # Get primary category
                categories = location.get('categories', {})
                primary_category = categories.get('primaryCategory', {}).get('displayName', 'Unknown')
                
                # Get address
                address = location.get('storefrontAddress', {})
                full_address = GoogleBusinessService._format_address(address)
                
                # Get phone
                phones = location.get('phoneNumbers', [])
                phone = phones[0] if phones else None
                
                # Get website
                website = location.get('websiteUri', None)
                
                # Get status
                metadata = location.get('metadata', {})
                verification_state = metadata.get('verificationState', 'UNVERIFIED')
                status = GoogleBusinessService._map_verification_status(verification_state)
                
                result.append({
                    'google_location_id': location_name,
                    'name': title,
                    'category': primary_category,
                    'full_address': full_address,
                    'city': address.get('locality', ''),
                    'state': address.get('administrativeArea', ''),
                    'country': address.get('regionCode', ''),
                    'website': website,
                    'phone': phone,
                    'status': status.value,
                    'verification_state': verification_state
                })
            
            return result
        
        except Exception as e:
            logger.error(f"Error fetching locations: {e}")
            raise ValueError(f"Failed to fetch Google Business locations: {str(e)}")
    
    @staticmethod
    def link_location_to_profile(
        db: Session,
        user_id: str,
        business_profile_id: str,
        google_location_id: str,
        location_data: Dict
    ) -> GoogleLocation:
        """
        Link a Google Business location to a business profile
        
        Args:
            db: Database session
            user_id: User ID
            business_profile_id: Business profile ID
            google_location_id: Google location ID
            location_data: Location details from Google API
            
        Returns:
            Created or updated GoogleLocation
        """
        # Check if location already exists
        existing_location = db.query(GoogleLocation).filter(
            GoogleLocation.google_location_id == google_location_id
        ).first()
        
        if existing_location:
            # Update existing location
            existing_location.business_profile_id = business_profile_id
            existing_location.name = location_data['name']
            existing_location.category = location_data.get('category')
            existing_location.full_address = location_data.get('full_address')
            existing_location.city = location_data.get('city')
            existing_location.state = location_data.get('state')
            existing_location.country = location_data.get('country')
            existing_location.website = location_data.get('website')
            existing_location.is_synced = True
            existing_location.last_fetched_at = datetime.utcnow()
            db.commit()
            db.refresh(existing_location)
            
            logger.info(f"Updated Google location {google_location_id} for profile {business_profile_id}")
            return existing_location
        else:
            # Create new location
            location = GoogleLocation(
                user_id=user_id,
                business_profile_id=business_profile_id,
                google_location_id=google_location_id,
                name=location_data['name'],
                category=location_data.get('category'),
                full_address=location_data.get('full_address'),
                city=location_data.get('city'),
                state=location_data.get('state'),
                country=location_data.get('country'),
                website=location_data.get('website'),
                status=LocationStatus(location_data.get('status', 'Verified')),
                is_synced=True,
                last_fetched_at=datetime.utcnow()
            )
            db.add(location)
            db.commit()
            db.refresh(location)
            
            logger.info(f"Linked Google location {google_location_id} to profile {business_profile_id}")
            return location
    
    @staticmethod
    async def sync_reviews(
        db: Session,
        user_id: str,
        google_location_id: str
    ) -> Dict:
        """
        Sync reviews for a Google Business location
        
        Args:
            db: Database session
            user_id: User ID
            google_location_id: Google location ID
            
        Returns:
            Sync result with count of new reviews
        """
        # Get credentials
        credentials = GoogleOAuthService.get_credentials(db, user_id)
        if not credentials:
            raise ValueError("Google account not connected or token expired")
        
        # Get location from database
        location = db.query(GoogleLocation).filter(
            GoogleLocation.google_location_id == google_location_id,
            GoogleLocation.user_id == user_id
        ).first()
        
        if not location:
            raise ValueError("Location not found or does not belong to user")
        
        try:
            # Build My Business API service
            service = build('mybusinessaccountmanagement', 'v1', credentials=credentials)
            
            # Fetch reviews from Google API
            # Note: The actual API endpoint for reviews is different
            # This is a simplified example - actual implementation needs proper API version
            reviews_response = service.locations().reviews().list(
                parent=google_location_id
            ).execute()
            
            reviews = reviews_response.get('reviews', [])
            
            logger.info(f"Found {len(reviews)} reviews for location {google_location_id}")
            
            new_reviews_count = 0
            updated_reviews_count = 0
            
            for review_data in reviews:
                google_review_id = review_data.get('reviewId') or review_data.get('name')
                
                # Check if review already exists
                existing_review = db.query(GoogleReview).filter(
                    GoogleReview.google_review_id == google_review_id
                ).first()
                
                # Extract review details
                reviewer = review_data.get('reviewer', {})
                reviewer_name = reviewer.get('displayName', 'Anonymous')
                reviewer_photo = reviewer.get('profilePhotoUrl')
                
                rating = review_data.get('starRating', 0)
                if isinstance(rating, str):
                    rating_map = {'ONE': 1, 'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5}
                    rating = rating_map.get(rating, 0)
                
                review_text = review_data.get('comment', '')
                
                # Parse review date
                create_time = review_data.get('createTime', datetime.utcnow().isoformat())
                review_date = datetime.fromisoformat(create_time.replace('Z', '+00:00'))
                
                # Get owner reply
                reply_data = review_data.get('reviewReply', {})
                owner_reply = reply_data.get('comment')
                owner_reply_date = None
                if reply_data.get('updateTime'):
                    owner_reply_date = datetime.fromisoformat(reply_data['updateTime'].replace('Z', '+00:00'))
                
                # Basic sentiment analysis (rule-based)
                sentiment_score, sentiment_label = GoogleBusinessService._analyze_sentiment(rating, review_text)
                
                if existing_review:
                    # Update existing review
                    existing_review.rating = rating
                    existing_review.review_text = review_text
                    existing_review.owner_reply = owner_reply
                    existing_review.owner_reply_date = owner_reply_date
                    existing_review.sentiment_score = sentiment_score
                    existing_review.sentiment_label = sentiment_label
                    updated_reviews_count += 1
                else:
                    # Create new review
                    review = GoogleReview(
                        google_location_id=location.id,
                        google_review_id=google_review_id,
                        reviewer_name=reviewer_name,
                        reviewer_photo_url=reviewer_photo,
                        rating=rating,
                        review_text=review_text,
                        review_date=review_date,
                        sentiment_score=sentiment_score,
                        sentiment_label=sentiment_label,
                        owner_reply=owner_reply,
                        owner_reply_date=owner_reply_date
                    )
                    db.add(review)
                    new_reviews_count += 1
            
            # Update location review stats
            total_reviews = db.query(GoogleReview).filter(
                GoogleReview.google_location_id == location.id
            ).count()
            
            # Calculate average rating
            reviews_list = db.query(GoogleReview).filter(
                GoogleReview.google_location_id == location.id
            ).all()
            
            if reviews_list:
                avg_rating = sum(r.rating for r in reviews_list) / len(reviews_list)
                location.average_rating = f"{avg_rating:.1f}"
            
            location.review_count = total_reviews
            location.last_fetched_at = datetime.utcnow()
            
            # Update google connection last sync time
            from app.models.google_connection import GoogleConnection
            connection = db.query(GoogleConnection).filter(
                GoogleConnection.user_id == user_id
            ).first()
            if connection:
                connection.last_synced_at = datetime.utcnow()
            
            db.commit()
            
            logger.info(f"Synced reviews for location {google_location_id}: {new_reviews_count} new, {updated_reviews_count} updated")
            
            return {
                "status": "completed",
                "new_reviews": new_reviews_count,
                "updated_reviews": updated_reviews_count,
                "total_reviews": total_reviews,
                "average_rating": location.average_rating
            }
        
        except Exception as e:
            logger.error(f"Error syncing reviews: {e}")
            raise ValueError(f"Failed to sync reviews: {str(e)}")
    
    @staticmethod
    def _format_address(address: Dict) -> str:
        """Format address dictionary to string"""
        parts = []
        if address.get('addressLines'):
            parts.extend(address['addressLines'])
        if address.get('locality'):
            parts.append(address['locality'])
        if address.get('administrativeArea'):
            parts.append(address['administrativeArea'])
        if address.get('postalCode'):
            parts.append(address['postalCode'])
        if address.get('regionCode'):
            parts.append(address['regionCode'])
        
        return ', '.join(parts) if parts else 'No address provided'
    
    @staticmethod
    def _map_verification_status(verification_state: str) -> LocationStatus:
        """Map Google verification state to our LocationStatus enum"""
        status_map = {
            'VERIFIED': LocationStatus.VERIFIED,
            'UNVERIFIED': LocationStatus.NEEDS_ATTENTION,
            'VERIFICATION_REQUESTED': LocationStatus.NEEDS_ATTENTION,
            'VERIFIED_RECENTLY': LocationStatus.VERIFIED,
        }
        return status_map.get(verification_state, LocationStatus.NEEDS_ATTENTION)
    
    @staticmethod
    def _analyze_sentiment(rating: int, text: str) -> tuple:
        """
        Basic rule-based sentiment analysis
        
        Args:
            rating: Review rating (1-5)
            text: Review text
            
        Returns:
            Tuple of (sentiment_score, sentiment_label)
        """
        # Simple rule-based sentiment
        if rating >= 4:
            sentiment_score = 0.8 if rating == 5 else 0.6
            sentiment_label = SentimentLabel.POSITIVE
        elif rating == 3:
            sentiment_score = 0.0
            sentiment_label = SentimentLabel.NEUTRAL
        else:
            sentiment_score = -0.6 if rating == 2 else -0.8
            sentiment_label = SentimentLabel.NEGATIVE
        
        # Adjust based on text if available
        if text:
            text_lower = text.lower()
            positive_words = ['great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'best']
            negative_words = ['terrible', 'horrible', 'awful', 'worst', 'bad', 'poor', 'disappointing']
            
            positive_count = sum(1 for word in positive_words if word in text_lower)
            negative_count = sum(1 for word in negative_words if word in text_lower)
            
            # Adjust score slightly based on word counts
            if positive_count > negative_count and rating >= 3:
                sentiment_score = min(1.0, sentiment_score + 0.1)
            elif negative_count > positive_count and rating <= 3:
                sentiment_score = max(-1.0, sentiment_score - 0.1)
        
        return sentiment_score, sentiment_label
