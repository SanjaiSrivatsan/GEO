"""
Brand Mention Discovery Service
Discovers off-site brand mentions through search engine scraping
"""
from sqlalchemy.orm import Session
from app.models.brand_mention import BrandMention, MentionType, MentionStatus, SentimentType
from app.models.business_profile import BusinessProfile
from bs4 import BeautifulSoup
from datetime import datetime
from typing import List, Dict, Set, Optional
from loguru import logger
import httpx
import re
import hashlib
from urllib.parse import urlparse, quote_plus
import time
import random


class SearchQueryGenerator:
    """Generates search queries for brand mention discovery"""
    
    @staticmethod
    def generate_queries(business_name: str, category: str, location: str, website: str = None) -> List[str]:
        """
        Generate search queries for finding brand mentions
        
        Args:
            business_name: Business name
            category: Business category
            location: Primary location
            website: Optional website URL
            
        Returns:
            List of search queries
        """
        queries = []
        
        # Clean inputs
        name_clean = business_name.strip()
        category_clean = category.strip().lower()
        location_clean = location.strip()
        
        # Extract domain if website provided
        domain = None
        if website:
            parsed = urlparse(website)
            domain = parsed.netloc or parsed.path
            domain = domain.replace('www.', '')
        
        # 1. Brand name only
        queries.append(f'"{name_clean}"')
        
        # 2. Brand + category
        queries.append(f'"{name_clean}" {category_clean}')
        
        # 3. Brand + location
        queries.append(f'"{name_clean}" {location_clean}')
        
        # 4. Brand + category + location
        queries.append(f'"{name_clean}" {category_clean} {location_clean}')
        
        # 5. Brand + review/reviews
        queries.append(f'"{name_clean}" review')
        queries.append(f'"{name_clean}" reviews')
        
        # 6. Brand + rating
        queries.append(f'"{name_clean}" rating')
        
        # 7. Domain-based queries (if website provided)
        if domain:
            queries.append(f'site:{domain}')
            queries.append(f'"{domain}"')
        
        # 8. Comparison queries
        queries.append(f'best {category_clean} {location_clean}')
        queries.append(f'top {category_clean} {location_clean}')
        
        # 9. Directory queries
        queries.append(f'"{name_clean}" yelp')
        queries.append(f'"{name_clean}" yellowpages')
        queries.append(f'"{name_clean}" google business')
        
        logger.info(f"Generated {len(queries)} search queries for {name_clean}")
        
        return queries


class SearchResultScraper:
    """Scrapes search results from Google and Bing"""
    
    # User agents for rotation
    USER_AGENTS = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    ]
    
    @staticmethod
    def scrape_google(query: str, max_results: int = 10) -> List[Dict]:
        """
        Scrape Google search results
        
        Args:
            query: Search query
            max_results: Maximum number of results to return
            
        Returns:
            List of result dictionaries with url, title, snippet
        """
        results = []
        
        try:
            # Random delay to avoid rate limiting
            time.sleep(random.uniform(1, 3))
            
            # Build Google search URL
            encoded_query = quote_plus(query)
            url = f"https://www.google.com/search?q={encoded_query}&num={max_results + 5}"
            
            # Random user agent
            headers = {
                'User-Agent': random.choice(SearchResultScraper.USER_AGENTS),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
            
            # Make request with timeout
            with httpx.Client(timeout=15.0, follow_redirects=True) as client:
                response = client.get(url, headers=headers)
                response.raise_for_status()
            
            # Parse HTML
            soup = BeautifulSoup(response.text, 'lxml')
            
            # Find search result divs (Google's structure changes often)
            # Try multiple selectors
            result_divs = soup.select('div.g') or soup.select('div[data-sokoban-container]')
            
            position = 1
            for div in result_divs:
                if len(results) >= max_results:
                    break
                
                # Extract link
                link_tag = div.find('a', href=True)
                if not link_tag or not link_tag['href'].startswith('http'):
                    continue
                
                result_url = link_tag['href']
                
                # Skip Google's own pages
                if 'google.com' in result_url:
                    continue
                
                # Extract title
                title_tag = div.find('h3')
                title = title_tag.get_text(strip=True) if title_tag else ''
                
                # Extract snippet
                snippet_tag = div.find('div', class_=lambda x: x and 'VwiC3b' in x) or \
                             div.find('span', class_=lambda x: x and 'aCOpRe' in x) or \
                             div.find('div', attrs={'data-sncf': '1'})
                snippet = snippet_tag.get_text(strip=True) if snippet_tag else ''
                
                # Only add if we have at least URL and title
                if result_url and title:
                    results.append({
                        'url': result_url,
                        'title': title,
                        'snippet': snippet,
                        'position': str(position),
                        'source': 'google'
                    })
                    position += 1
            
            logger.info(f"Scraped {len(results)} results from Google for query: {query[:50]}...")
            
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                logger.warning(f"Rate limited by Google (429). Consider adding delay.")
            else:
                logger.error(f"HTTP error scraping Google: {e}")
        except Exception as e:
            logger.error(f"Error scraping Google: {e}")
        
        return results
    
    @staticmethod
    def scrape_bing(query: str, max_results: int = 10) -> List[Dict]:
        """
        Scrape Bing search results
        
        Args:
            query: Search query
            max_results: Maximum number of results to return
            
        Returns:
            List of result dictionaries with url, title, snippet
        """
        results = []
        
        try:
            # Random delay
            time.sleep(random.uniform(1, 3))
            
            # Build Bing search URL
            encoded_query = quote_plus(query)
            url = f"https://www.bing.com/search?q={encoded_query}&count={max_results + 5}"
            
            # Random user agent
            headers = {
                'User-Agent': random.choice(SearchResultScraper.USER_AGENTS),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            }
            
            # Make request
            with httpx.Client(timeout=15.0, follow_redirects=True) as client:
                response = client.get(url, headers=headers)
                response.raise_for_status()
            
            # Parse HTML
            soup = BeautifulSoup(response.text, 'lxml')
            
            # Find search results (Bing structure)
            result_divs = soup.select('li.b_algo')
            
            position = 1
            for div in result_divs:
                if len(results) >= max_results:
                    break
                
                # Extract link
                link_tag = div.find('h2').find('a') if div.find('h2') else None
                if not link_tag or not link_tag.get('href', '').startswith('http'):
                    continue
                
                result_url = link_tag['href']
                
                # Skip Bing's own pages
                if 'bing.com' in result_url or 'microsoft.com' in result_url:
                    continue
                
                # Extract title
                title = link_tag.get_text(strip=True)
                
                # Extract snippet
                snippet_tag = div.find('p') or div.find('div', class_='b_caption')
                snippet = snippet_tag.get_text(strip=True) if snippet_tag else ''
                
                if result_url and title:
                    results.append({
                        'url': result_url,
                        'title': title,
                        'snippet': snippet,
                        'position': str(position),
                        'source': 'bing'
                    })
                    position += 1
            
            logger.info(f"Scraped {len(results)} results from Bing for query: {query[:50]}...")
            
        except Exception as e:
            logger.error(f"Error scraping Bing: {e}")
        
        return results


class MentionDiscoveryService:
    """Main service for brand mention discovery"""
    
    @staticmethod
    def _generate_url_hash(url: str) -> str:
        """Generate hash for URL de-duplication"""
        # Normalize URL
        parsed = urlparse(url)
        normalized = f"{parsed.netloc}{parsed.path}".lower()
        normalized = normalized.rstrip('/')
        return hashlib.md5(normalized.encode()).hexdigest()
    
    @staticmethod
    def _extract_domain(url: str) -> str:
        """Extract domain from URL"""
        parsed = urlparse(url)
        domain = parsed.netloc or parsed.path
        domain = domain.replace('www.', '')
        return domain
    
    @staticmethod
    def _determine_mention_type(url: str, title: str, snippet: str) -> MentionType:
        """
        Determine mention type based on URL, title, and snippet
        
        Args:
            url: Source URL
            title: Page title
            snippet: Text snippet
            
        Returns:
            MentionType enum value
        """
        url_lower = url.lower()
        title_lower = title.lower()
        snippet_lower = snippet.lower()
        
        # Directory sites
        directory_domains = ['yelp', 'yellowpages', 'whitepages', 'manta', 'superpages', 
                            'citysearch', 'foursquare', 'mapquest', 'kudzu', 'merchantcircle',
                            'brownbook', 'hotfrog', 'cylex', 'tupalo', 'justdial']
        if any(d in url_lower for d in directory_domains):
            return MentionType.DIRECTORY
        
        # Review sites
        review_domains = ['trustpilot', 'bbb.org', 'consumeraffairs', 'sitejabber', 
                         'resellerratings', 'ripoffreport', 'complaintsboard']
        review_keywords = ['review', 'rating', 'customer feedback', 'testimonial']
        if any(d in url_lower for d in review_domains) or \
           any(k in title_lower or k in snippet_lower for k in review_keywords):
            return MentionType.REVIEW
        
        # News/article sites
        news_domains = ['news', 'press', 'article', 'forbes', 'reuters', 'bloomberg', 
                       'businesswire', 'prweb', 'prnewswire']
        if any(d in url_lower for d in news_domains) or 'press release' in title_lower:
            return MentionType.ARTICLE
        
        # Blog sites
        blog_keywords = ['blog', 'blogger', 'wordpress', 'medium.com', 'tumblr']
        if any(k in url_lower for k in blog_keywords):
            return MentionType.BLOG
        
        # Comparison/ranking sites
        comparison_keywords = ['best', 'top', 'compare', 'vs', 'versus', 'comparison', 
                              'ranking', 'alternatives']
        if any(k in title_lower or k in snippet_lower for k in comparison_keywords):
            return MentionType.COMPARISON
        
        # Social media (if indexable)
        social_domains = ['facebook', 'linkedin', 'twitter', 'instagram']
        if any(d in url_lower for d in social_domains):
            return MentionType.SOCIAL
        
        return MentionType.OTHER
    
    @staticmethod
    def _analyze_basic_sentiment(title: str, snippet: str) -> SentimentType:
        """
        Basic rule-based sentiment analysis
        
        Args:
            title: Page title
            snippet: Text snippet
            
        Returns:
            SentimentType enum value
        """
        text = (title + ' ' + snippet).lower()
        
        # Positive indicators
        positive_words = ['best', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
                         'top', 'recommended', 'love', 'perfect', 'outstanding', 'superb',
                         'exceptional', 'awesome', 'brilliant', 'quality', 'professional']
        
        # Negative indicators
        negative_words = ['worst', 'bad', 'terrible', 'horrible', 'awful', 'poor', 'scam',
                         'fraud', 'ripoff', 'complaint', 'problem', 'issue', 'avoid',
                         'disappointed', 'unprofessional', 'rude', 'never', 'waste']
        
        positive_count = sum(1 for word in positive_words if word in text)
        negative_count = sum(1 for word in negative_words if word in text)
        
        if negative_count > positive_count:
            return SentimentType.NEGATIVE
        elif positive_count > negative_count:
            return SentimentType.POSITIVE
        elif positive_count > 0 or negative_count > 0:
            return SentimentType.NEUTRAL
        else:
            return SentimentType.UNKNOWN
    
    @staticmethod
    async def discover_mentions(
        db: Session,
        business_profile_id: str,
        user_id: str,
        use_google: bool = True,
        use_bing: bool = True,
        max_results_per_query: int = 10
    ) -> Dict:
        """
        Discover brand mentions for a business profile
        
        Args:
            db: Database session
            business_profile_id: Business profile ID
            user_id: User ID
            use_google: Whether to use Google search
            use_bing: Whether to use Bing search
            max_results_per_query: Max results per query
            
        Returns:
            Discovery result summary
        """
        # Get business profile
        profile = db.query(BusinessProfile).filter(
            BusinessProfile.id == business_profile_id,
            BusinessProfile.user_id == user_id
        ).first()
        
        if not profile:
            raise ValueError("Business profile not found")
        
        logger.info(f"Starting mention discovery for business: {profile.name}")
        
        # Generate search queries
        queries = SearchQueryGenerator.generate_queries(
            business_name=profile.name,
            category=profile.category,
            location=profile.primary_location,
            website=profile.website
        )
        
        # Track unique URLs (for de-duplication)
        seen_url_hashes: Set[str] = set()
        all_results = []
        
        # Scrape search results
        for query in queries:
            # Google search
            if use_google:
                google_results = SearchResultScraper.scrape_google(query, max_results_per_query)
                for result in google_results:
                    result['query'] = query
                    all_results.append(result)
            
            # Bing search
            if use_bing:
                bing_results = SearchResultScraper.scrape_bing(query, max_results_per_query)
                for result in bing_results:
                    result['query'] = query
                    all_results.append(result)
        
        logger.info(f"Scraped total of {len(all_results)} results (before de-duplication)")
        
        # De-duplicate and store mentions
        new_mentions_count = 0
        updated_mentions_count = 0
        skipped_count = 0
        
        for result in all_results:
            url = result['url']
            url_hash = MentionDiscoveryService._generate_url_hash(url)
            
            # Skip if already seen in this batch
            if url_hash in seen_url_hashes:
                skipped_count += 1
                continue
            
            seen_url_hashes.add(url_hash)
            
            # Check if mention already exists
            existing_mention = db.query(BrandMention).filter(
                BrandMention.business_profile_id == business_profile_id,
                BrandMention.source_url == url
            ).first()
            
            # Determine mention type and sentiment
            mention_type = MentionDiscoveryService._determine_mention_type(
                url, result['title'], result['snippet']
            )
            sentiment = MentionDiscoveryService._analyze_basic_sentiment(
                result['title'], result['snippet']
            )
            domain = MentionDiscoveryService._extract_domain(url)
            
            if existing_mention:
                # Update existing mention
                existing_mention.page_title = result['title']
                existing_mention.extracted_snippet = result['snippet']
                existing_mention.mention_type = mention_type
                existing_mention.sentiment = sentiment
                existing_mention.search_query = result['query']
                existing_mention.search_position = result['position']
                existing_mention.discovery_method = result['source'] + '_search'
                existing_mention.updated_at = datetime.utcnow()
                updated_mentions_count += 1
            else:
                # Create new mention
                mention = BrandMention(
                    business_profile_id=business_profile_id,
                    user_id=user_id,
                    source_url=url,
                    source_domain=domain,
                    canonical_url=url,  # Could be enhanced with canonical extraction
                    page_title=result['title'],
                    extracted_snippet=result['snippet'],
                    mention_type=mention_type,
                    sentiment=sentiment,
                    status=MentionStatus.DISCOVERED,
                    search_query=result['query'],
                    search_position=result['position'],
                    discovery_method=result['source'] + '_search',
                    discovered_at=datetime.utcnow()
                )
                db.add(mention)
                new_mentions_count += 1
        
        # Commit all changes
        db.commit()
        
        # Get total mentions for this business
        total_mentions = db.query(BrandMention).filter(
            BrandMention.business_profile_id == business_profile_id
        ).count()
        
        result_summary = {
            "status": "completed",
            "queries_executed": len(queries),
            "results_scraped": len(all_results),
            "new_mentions": new_mentions_count,
            "updated_mentions": updated_mentions_count,
            "skipped_duplicates": skipped_count,
            "total_mentions": total_mentions
        }
        
        logger.info(f"Mention discovery completed: {result_summary}")
        
        return result_summary
    
    @staticmethod
    def get_mentions(
        db: Session,
        business_profile_id: str,
        user_id: str,
        mention_type: Optional[MentionType] = None,
        sentiment: Optional[SentimentType] = None,
        status: Optional[MentionStatus] = None,
        limit: int = 100
    ) -> List[BrandMention]:
        """
        Get brand mentions for a business profile
        
        Args:
            db: Database session
            business_profile_id: Business profile ID
            user_id: User ID
            mention_type: Optional filter by mention type
            sentiment: Optional filter by sentiment
            status: Optional filter by status
            limit: Maximum number of results
            
        Returns:
            List of BrandMention objects
        """
        query = db.query(BrandMention).filter(
            BrandMention.business_profile_id == business_profile_id,
            BrandMention.user_id == user_id
        )
        
        if mention_type:
            query = query.filter(BrandMention.mention_type == mention_type)
        
        if sentiment:
            query = query.filter(BrandMention.sentiment == sentiment)
        
        if status:
            query = query.filter(BrandMention.status == status)
        
        mentions = query.order_by(BrandMention.discovered_at.desc()).limit(limit).all()
        
        return mentions
