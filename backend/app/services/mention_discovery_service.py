"""
Brand Mention Discovery Service
Discovers off-site brand mentions through multiple search engines
with VADER sentiment analysis and DuckDuckGo integration.

BIS Integration: Google Custom Search API, YouTube Data API v3, NewsAPI, JustDial.
"""
from sqlalchemy.orm import Session
from app.models.brand_mention import BrandMention, MentionType, MentionStatus, SentimentType
from app.models.business_profile import BusinessProfile
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
from typing import List, Dict, Set, Optional
from loguru import logger
import httpx
import re
import hashlib
import os
from urllib.parse import urlparse, quote_plus
import time
import random

# VADER sentiment — graceful fallback if not installed
try:    
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    _vader = SentimentIntensityAnalyzer()
    HAS_VADER = True
    logger.info("VADER sentiment analyzer loaded")
except ImportError:
    _vader = None
    HAS_VADER = False
    logger.warning("vaderSentiment not installed — falling back to rule-based sentiment")

# DuckDuckGo search — try new 'ddgs' package first, fall back to 'duckduckgo_search'
try:
    from ddgs import DDGS
    HAS_DDG = True
    logger.info("DuckDuckGo search engine loaded (ddgs)")
except ImportError:
    try:
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", RuntimeWarning)
            from duckduckgo_search import DDGS
        HAS_DDG = True
        logger.info("DuckDuckGo search engine loaded (duckduckgo_search fallback)")
    except ImportError:
        HAS_DDG = False
        logger.warning("Neither ddgs nor duckduckgo-search installed — DDG search disabled")


class SearchQueryGenerator:
    """Generates search queries for brand mention discovery"""

    @staticmethod
    def generate_queries(business_name: str, category: str, location: str, website: str = None) -> List[str]:
        queries = []
        name_clean = business_name.strip()
        category_clean = category.strip().lower()
        location_clean = location.strip()

        domain = None
        if website:
            parsed = urlparse(website)
            domain = parsed.netloc or parsed.path
            domain = domain.replace('www.', '')

        # Core brand queries
        queries.append(f'"{name_clean}"')
        queries.append(f'"{name_clean}" {category_clean}')
        queries.append(f'"{name_clean}" {location_clean}')
        queries.append(f'"{name_clean}" {category_clean} {location_clean}')

        # Review & rating queries
        queries.append(f'"{name_clean}" review')
        queries.append(f'"{name_clean}" reviews')
        queries.append(f'"{name_clean}" rating')

        # Domain-based queries
        if domain:
            queries.append(f'site:{domain}')
            queries.append(f'"{domain}"')

        # Comparison / ranking queries
        queries.append(f'best {category_clean} {location_clean}')
        queries.append(f'top {category_clean} {location_clean}')

        # Directory queries
        queries.append(f'"{name_clean}" yelp')
        queries.append(f'"{name_clean}" yellowpages')
        queries.append(f'"{name_clean}" tripadvisor')
        queries.append(f'"{name_clean}" zomato')

        logger.info(f"Generated {len(queries)} search queries for {name_clean}")
        return queries


class SearchResultScraper:
    """Scrapes search results from Google, Bing, and DuckDuckGo"""

    USER_AGENTS = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    ]

    @staticmethod
    def scrape_google(query: str, max_results: int = 10) -> List[Dict]:
        """Scrape Google search results"""
        results = []
        try:
            time.sleep(random.uniform(2, 4))
            encoded_query = quote_plus(query)
            url = f"https://www.google.com/search?q={encoded_query}&num={max_results + 5}"
            headers = {
                'User-Agent': random.choice(SearchResultScraper.USER_AGENTS),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
            with httpx.Client(timeout=15.0, follow_redirects=True) as client:
                response = client.get(url, headers=headers)
                response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')
            result_divs = soup.select('div.g') or soup.select('div[data-sokoban-container]')
            position = 1
            for div in result_divs:
                if len(results) >= max_results:
                    break
                link_tag = div.find('a', href=True)
                if not link_tag or not link_tag['href'].startswith('http'):
                    continue
                result_url = link_tag['href']
                if 'google.com' in result_url:
                    continue
                title_tag = div.find('h3')
                title = title_tag.get_text(strip=True) if title_tag else ''
                snippet_tag = (div.find('div', class_=lambda x: x and 'VwiC3b' in x) or
                               div.find('span', class_=lambda x: x and 'aCOpRe' in x) or
                               div.find('div', attrs={'data-sncf': '1'}))
                snippet = snippet_tag.get_text(strip=True) if snippet_tag else ''
                if result_url and title:
                    results.append({
                        'url': result_url, 'title': title, 'snippet': snippet,
                        'position': str(position), 'source': 'google'
                    })
                    position += 1
            logger.info(f"Google: {len(results)} results for '{query[:50]}...'")
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                logger.warning("Google rate limited (429)")
            else:
                logger.error(f"Google HTTP error: {e}")
        except Exception as e:
            logger.error(f"Google scraping error: {e}")
        return results

    @staticmethod
    def scrape_bing(query: str, max_results: int = 10) -> List[Dict]:
        """Scrape Bing search results"""
        results = []
        try:
            time.sleep(random.uniform(1, 3))
            encoded_query = quote_plus(query)
            url = f"https://www.bing.com/search?q={encoded_query}&count={max_results + 5}"
            headers = {
                'User-Agent': random.choice(SearchResultScraper.USER_AGENTS),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            }
            with httpx.Client(timeout=15.0, follow_redirects=True) as client:
                response = client.get(url, headers=headers)
                response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')
            result_divs = soup.select('li.b_algo')
            position = 1
            for div in result_divs:
                if len(results) >= max_results:
                    break
                link_tag = div.find('h2').find('a') if div.find('h2') else None
                if not link_tag or not link_tag.get('href', '').startswith('http'):
                    continue
                result_url = link_tag['href']
                if 'bing.com' in result_url or 'microsoft.com' in result_url:
                    continue
                title = link_tag.get_text(strip=True)
                snippet_tag = div.find('p') or div.find('div', class_='b_caption')
                snippet = snippet_tag.get_text(strip=True) if snippet_tag else ''
                if result_url and title:
                    results.append({
                        'url': result_url, 'title': title, 'snippet': snippet,
                        'position': str(position), 'source': 'bing'
                    })
                    position += 1
            logger.info(f"Bing: {len(results)} results for '{query[:50]}...'")
        except Exception as e:
            logger.error(f"Bing scraping error: {e}")
        return results

    @staticmethod
    def search_duckduckgo(query: str, max_results: int = 10) -> List[Dict]:
        """Search using DuckDuckGo API (no rate limits, no key needed)"""
        results = []
        if not HAS_DDG:
            return results
        try:
            with DDGS() as ddgs:
                ddg_results = list(ddgs.text(query, region='in-en', max_results=max_results))
            position = 1
            for item in ddg_results:
                url = item.get('href', '')
                title = item.get('title', '')
                snippet = item.get('body', '')
                if url and title:
                    results.append({
                        'url': url, 'title': title, 'snippet': snippet,
                        'position': str(position), 'source': 'duckduckgo'
                    })
                    position += 1
            logger.info(f"DuckDuckGo: {len(results)} results for '{query[:50]}...'")
        except Exception as e:
            logger.error(f"DuckDuckGo search error: {e}")
        return results


# ---------------------------------------------------------------------------
# BIS Integration: Google Custom Search API
# ---------------------------------------------------------------------------
class GoogleCSEClient:
    """Google Custom Search API client (100 free searches/day).
    Get key: https://developers.google.com/custom-search/v1/introduction
    Create CSE: https://programmablesearchengine.google.com/
    """

    BASE_URL = "https://www.googleapis.com/customsearch/v1"

    @staticmethod
    def search(query: str, max_results: int = 10) -> List[Dict]:
        api_key = os.getenv("GOOGLE_CSE_API_KEY", "")
        cse_id = os.getenv("GOOGLE_CSE_ID", "")
        if not api_key or not cse_id:
            logger.debug("Google Custom Search not configured (GOOGLE_CSE_API_KEY / GOOGLE_CSE_ID)")
            return []
        results = []
        try:
            params = {
                "key": api_key,
                "cx": cse_id,
                "q": query,
                "num": min(max_results, 10),
            }
            with httpx.Client(timeout=10.0) as client:
                response = client.get(GoogleCSEClient.BASE_URL, params=params)
                response.raise_for_status()
                data = response.json()
            for i, item in enumerate(data.get("items", []), start=1):
                results.append({
                    "url": item.get("link", ""),
                    "title": item.get("title", ""),
                    "snippet": item.get("snippet", ""),
                    "position": str(i),
                    "source": "google_cse",
                })
            logger.info(f"Google CSE: {len(results)} results for '{query[:50]}'")
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                logger.warning("Google CSE quota exceeded (429)")
            else:
                logger.error(f"Google CSE HTTP error {e.response.status_code}: {e}")
        except Exception as e:
            logger.error(f"Google CSE error: {e}")
        return results


# ---------------------------------------------------------------------------
# BIS Integration: YouTube Data API v3
# ---------------------------------------------------------------------------
class YouTubeAPIClient:
    """YouTube Data API v3 client (10,000 quota units/day free).
    Enable at: https://console.cloud.google.com/apis/library
    Key env var: YOUTUBE_API_KEY (or same as GOOGLE_CSE_API_KEY if YouTube API enabled).
    """

    SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"

    @staticmethod
    def search(query: str, max_results: int = 10) -> List[Dict]:
        api_key = os.getenv("YOUTUBE_API_KEY", "")
        if not api_key:
            logger.debug("YouTube API not configured (YOUTUBE_API_KEY)")
            return []
        results = []
        try:
            params = {
                "key": api_key,
                "q": query,
                "part": "snippet",
                "type": "video",
                "maxResults": min(max_results, 50),
                "order": "relevance",
            }
            with httpx.Client(timeout=10.0) as client:
                response = client.get(YouTubeAPIClient.SEARCH_URL, params=params)
                response.raise_for_status()
                data = response.json()
            for i, item in enumerate(data.get("items", []), start=1):
                snippet = item.get("snippet", {})
                video_id = item.get("id", {}).get("videoId", "")
                title = snippet.get("title", "")
                description = snippet.get("description", "")
                url = f"https://www.youtube.com/watch?v={video_id}" if video_id else ""
                if url and title:
                    results.append({
                        "url": url,
                        "title": title,
                        "snippet": description[:300],
                        "position": str(i),
                        "source": "youtube",
                    })
            logger.info(f"YouTube API: {len(results)} results for '{query[:50]}'")
        except httpx.HTTPStatusError as e:
            logger.error(f"YouTube API error {e.response.status_code}: {e}")
        except Exception as e:
            logger.error(f"YouTube search error: {e}")
        return results


# ---------------------------------------------------------------------------
# BIS Integration: NewsAPI
# ---------------------------------------------------------------------------
class NewsAPIClient:
    """NewsAPI client (100 requests/day free).
    Register: https://newsapi.org/register
    Key env var: NEWS_API_KEY
    """

    BASE_URL = "https://newsapi.org/v2/everything"

    @staticmethod
    def search(query: str, max_results: int = 10) -> List[Dict]:
        api_key = os.getenv("NEWS_API_KEY", "")
        if not api_key:
            logger.debug("NewsAPI not configured (NEWS_API_KEY)")
            return []
        results = []
        try:
            from_date = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")
            params = {
                "apiKey": api_key,
                "q": query,
                "language": "en",
                "sortBy": "publishedAt",
                "from": from_date,
                "pageSize": min(max_results, 100),
            }
            with httpx.Client(timeout=10.0) as client:
                response = client.get(NewsAPIClient.BASE_URL, params=params)
                response.raise_for_status()
                data = response.json()
            for i, article in enumerate(data.get("articles", []), start=1):
                title = article.get("title", "")
                description = article.get("description", "")
                url = article.get("url", "")
                if url and title and title != "[Removed]":
                    results.append({
                        "url": url,
                        "title": title,
                        "snippet": description or "",
                        "position": str(i),
                        "source": "newsapi",
                    })
            logger.info(f"NewsAPI: {len(results)} results for '{query[:50]}'")
        except httpx.HTTPStatusError as e:
            logger.error(f"NewsAPI error {e.response.status_code}: {e}")
        except Exception as e:
            logger.error(f"NewsAPI error: {e}")
        return results


# ---------------------------------------------------------------------------
# BIS Integration: JustDial web scraper (India-specific, free)
# ---------------------------------------------------------------------------
class JustDialMentionFetcher:
    """Fetches JustDial business listings/reviews for Indian businesses (free, no API)."""

    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.justdial.com/",
    }

    @staticmethod
    def search(business_name: str, location: str, max_results: int = 5) -> List[Dict]:
        results = []
        try:
            # Build JustDial search URL
            query = f"{business_name} {location}".replace(" ", "-").lower()
            url = f"https://www.justdial.com/{location.split(',')[0].strip()}/{quote_plus(business_name)}"
            time.sleep(random.uniform(2, 4))
            with httpx.Client(timeout=15.0, follow_redirects=True) as client:
                response = client.get(url, headers=JustDialMentionFetcher.HEADERS)
                if response.status_code != 200:
                    logger.debug(f"JustDial returned {response.status_code}")
                    return []
            soup = BeautifulSoup(response.text, "html.parser")
            # Extract listing items
            listings = (
                soup.find_all("li", class_=re.compile(r"cntanr", re.I)) or
                soup.find_all("div", class_=re.compile(r"resultbox", re.I)) or
                soup.find_all("section", class_=re.compile(r"result", re.I))
            )
            for listing in listings[:max_results]:
                # Try to extract title and link
                link_tag = listing.find("a", href=True)
                title_tag = listing.find(["h2", "h3", "span"], class_=re.compile(r"lng_nm|bussinessname", re.I))
                review_tag = listing.find("p", class_=re.compile(r"review|feedback", re.I))
                if not link_tag:
                    continue
                href = link_tag.get("href", "")
                if not href.startswith("http"):
                    href = "https://www.justdial.com" + href
                title = title_tag.get_text(strip=True) if title_tag else business_name
                snippet = review_tag.get_text(strip=True) if review_tag else f"{business_name} on JustDial"
                results.append({
                    "url": href,
                    "title": title,
                    "snippet": snippet,
                    "position": str(len(results) + 1),
                    "source": "justdial",
                })
            # If no structured listings, add the search page itself as a mention
            if not results:
                results.append({
                    "url": url,
                    "title": f"{business_name} - JustDial",
                    "snippet": f"JustDial listing for {business_name} in {location}",
                    "position": "1",
                    "source": "justdial",
                })
            logger.info(f"JustDial: {len(results)} results for '{business_name}'")
        except Exception as e:
            logger.error(f"JustDial fetch error: {e}")
        return results


class MentionDiscoveryService:
    """Main service for brand mention discovery"""

    @staticmethod
    def _generate_url_hash(url: str) -> str:
        parsed = urlparse(url)
        normalized = f"{parsed.netloc}{parsed.path}".lower().rstrip('/')
        return hashlib.md5(normalized.encode()).hexdigest()

    @staticmethod
    def _extract_domain(url: str) -> str:
        parsed = urlparse(url)
        domain = parsed.netloc or parsed.path
        return domain.replace('www.', '')

    @staticmethod
    def _determine_mention_type(url: str, title: str, snippet: str) -> MentionType:
        url_lower = url.lower()
        title_lower = title.lower()
        snippet_lower = snippet.lower()

        directory_domains = [
            'yelp', 'yellowpages', 'whitepages', 'manta', 'superpages',
            'citysearch', 'foursquare', 'mapquest', 'kudzu', 'merchantcircle',
            'brownbook', 'hotfrog', 'cylex', 'tupalo', 'justdial', 'zomato',
            'tripadvisor', 'bbb.org', 'glassdoor'
        ]
        if any(d in url_lower for d in directory_domains):
            return MentionType.DIRECTORY

        review_domains = ['trustpilot', 'consumeraffairs', 'sitejabber',
                          'resellerratings', 'ripoffreport', 'complaintsboard']
        review_keywords = ['review', 'rating', 'customer feedback', 'testimonial']
        if (any(d in url_lower for d in review_domains) or
                any(k in title_lower or k in snippet_lower for k in review_keywords)):
            return MentionType.REVIEW

        news_domains = ['news', 'press', 'article', 'forbes', 'reuters', 'bloomberg',
                        'businesswire', 'prweb', 'prnewswire', 'economictimes', 'ndtv']
        if any(d in url_lower for d in news_domains) or 'press release' in title_lower:
            return MentionType.ARTICLE

        blog_keywords = ['blog', 'blogger', 'wordpress', 'medium.com', 'tumblr', 'substack']
        if any(k in url_lower for k in blog_keywords):
            return MentionType.BLOG

        comparison_keywords = ['best', 'top', 'compare', 'vs', 'versus', 'comparison',
                               'ranking', 'alternatives']
        if any(k in title_lower or k in snippet_lower for k in comparison_keywords):
            return MentionType.COMPARISON

        social_domains = ['facebook', 'linkedin', 'twitter', 'instagram', 'reddit', 'quora']
        if any(d in url_lower for d in social_domains):
            return MentionType.SOCIAL

        return MentionType.OTHER

    @staticmethod
    def _analyze_sentiment(title: str, snippet: str) -> SentimentType:
        """Analyze sentiment using VADER (ML) with rule-based fallback"""
        text = f"{title} {snippet}".strip()
        if not text:
            return SentimentType.UNKNOWN

        # VADER sentiment (if available)
        if HAS_VADER and _vader:
            scores = _vader.polarity_scores(text)
            compound = scores['compound']
            if compound >= 0.05:
                return SentimentType.POSITIVE
            elif compound <= -0.05:
                return SentimentType.NEGATIVE
            else:
                return SentimentType.NEUTRAL

        # Fallback: rule-based
        text_lower = text.lower()
        positive_words = [
            'best', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
            'top', 'recommended', 'love', 'perfect', 'outstanding', 'superb',
            'exceptional', 'awesome', 'brilliant', 'quality', 'professional',
            'delicious', 'favorite', 'incredible'
        ]
        negative_words = [
            'worst', 'bad', 'terrible', 'horrible', 'awful', 'poor', 'scam',
            'fraud', 'ripoff', 'complaint', 'problem', 'issue', 'avoid',
            'disappointed', 'unprofessional', 'rude', 'never', 'waste',
            'disgusting', 'overpriced'
        ]
        p = sum(1 for w in positive_words if w in text_lower)
        n = sum(1 for w in negative_words if w in text_lower)
        if n > p:
            return SentimentType.NEGATIVE
        elif p > n:
            return SentimentType.POSITIVE
        elif p > 0 or n > 0:
            return SentimentType.NEUTRAL
        return SentimentType.UNKNOWN

    @staticmethod
    async def discover_mentions(
        db: Session,
        business_profile_id: str,
        user_id: str,
        use_google: bool = True,
        use_bing: bool = True,
        use_duckduckgo: bool = True,
        use_google_cse: bool = True,
        use_youtube: bool = True,
        use_newsapi: bool = True,
        use_justdial: bool = True,
        max_results_per_query: int = 10
    ) -> Dict:
        """Discover brand mentions for a business profile"""
        profile = db.query(BusinessProfile).filter(
            BusinessProfile.id == business_profile_id,
            BusinessProfile.user_id == user_id
        ).first()

        if not profile:
            raise ValueError("Business profile not found")

        logger.info(f"Starting mention discovery for '{profile.name}'")

        queries = SearchQueryGenerator.generate_queries(
            business_name=profile.name,
            category=profile.category,
            location=profile.primary_location,
            website=profile.website
        )

        # Collect from all search engines
        seen_url_hashes: Set[str] = set()
        all_results: List[Dict] = []
        engines_used: List[str] = []

        for query in queries:
            # DuckDuckGo first (most reliable, no rate limits)
            if use_duckduckgo and HAS_DDG:
                ddg_results = SearchResultScraper.search_duckduckgo(query, max_results_per_query)
                for r in ddg_results:
                    r['query'] = query
                    all_results.append(r)
                if 'duckduckgo' not in engines_used and ddg_results:
                    engines_used.append('duckduckgo')

            if use_google:
                google_results = SearchResultScraper.scrape_google(query, max_results_per_query)
                for r in google_results:
                    r['query'] = query
                    all_results.append(r)
                if 'google' not in engines_used and google_results:
                    engines_used.append('google')

            if use_bing:
                bing_results = SearchResultScraper.scrape_bing(query, max_results_per_query)
                for r in bing_results:
                    r['query'] = query
                    all_results.append(r)
                if 'bing' not in engines_used and bing_results:
                    engines_used.append('bing')

        logger.info(f"Scraped {len(all_results)} total results from {engines_used} (before BIS sources)")

        # -------------------------------------------------------
        # BIS Integration: Google Custom Search API
        # -------------------------------------------------------
        if use_google_cse and os.getenv("GOOGLE_CSE_API_KEY") and os.getenv("GOOGLE_CSE_ID"):
            core_queries = [
                f'"{profile.name}"',
                f'"{profile.name}" {profile.primary_location}',
                f'"{profile.name}" review',
            ]
            for q in core_queries:
                cse_results = GoogleCSEClient.search(q, max_results=10)
                for r in cse_results:
                    r["query"] = q
                    all_results.append(r)
                if "google_cse" not in engines_used and cse_results:
                    engines_used.append("google_cse")
                time.sleep(0.5)  # Respect quota

        # -------------------------------------------------------
        # BIS Integration: YouTube Data API v3
        # -------------------------------------------------------
        if use_youtube and os.getenv("YOUTUBE_API_KEY"):
            yt_queries = [
                f"{profile.name} {profile.primary_location}",
                f"{profile.name} review",
            ]
            for q in yt_queries:
                yt_results = YouTubeAPIClient.search(q, max_results=10)
                for r in yt_results:
                    r["query"] = q
                    all_results.append(r)
                if "youtube" not in engines_used and yt_results:
                    engines_used.append("youtube")

        # -------------------------------------------------------
        # BIS Integration: NewsAPI
        # -------------------------------------------------------
        if use_newsapi and os.getenv("NEWS_API_KEY"):
            news_queries = [
                f'"{profile.name}"',
                f'"{profile.name}" {profile.primary_location}',
            ]
            for q in news_queries:
                news_results = NewsAPIClient.search(q, max_results=20)
                for r in news_results:
                    r["query"] = q
                    all_results.append(r)
                if "newsapi" not in engines_used and news_results:
                    engines_used.append("newsapi")

        # -------------------------------------------------------
        # BIS Integration: JustDial (India-specific, free)
        # -------------------------------------------------------
        if use_justdial:
            jd_results = JustDialMentionFetcher.search(
                profile.name, profile.primary_location, max_results=5
            )
            for r in jd_results:
                r["query"] = f"{profile.name} {profile.primary_location}"
                all_results.append(r)
            if "justdial" not in engines_used and jd_results:
                engines_used.append("justdial")

        logger.info(f"Scraped {len(all_results)} total results from {engines_used} (before de-dup)")

        # Filter out the business's own website
        own_domain = None
        if profile.website:
            parsed = urlparse(profile.website)
            own_domain = (parsed.netloc or parsed.path).replace('www.', '').lower()

        # De-duplicate and store
        new_mentions_count = 0
        updated_mentions_count = 0
        skipped_count = 0

        # Extract business name keywords for relevance filtering
        biz_name_lower = profile.name.lower().strip()
        # Split into keywords (e.g., "KFC" or "Pizza Hut" -> ["kfc"] or ["pizza", "hut"])
        biz_keywords = [w for w in biz_name_lower.split() if len(w) >= 2]

        for result in all_results:
            url = result['url']
            url_hash = MentionDiscoveryService._generate_url_hash(url)

            if url_hash in seen_url_hashes:
                skipped_count += 1
                continue
            seen_url_hashes.add(url_hash)

            # Skip own website URLs
            result_domain = MentionDiscoveryService._extract_domain(url).lower()
            if own_domain and own_domain in result_domain:
                skipped_count += 1
                continue

            # Relevance filter: require business name in title, snippet, or URL
            combined_text = (
                (result.get('title') or '') + ' ' +
                (result.get('snippet') or '') + ' ' +
                url
            ).lower()
            if not any(kw in combined_text for kw in biz_keywords):
                skipped_count += 1
                continue

            # Skip mostly non-English results (more than 30% non-ASCII chars in title)
            title_text = result.get('title') or ''
            if title_text:
                non_ascii = sum(1 for c in title_text if ord(c) > 127)
                if non_ascii / max(len(title_text), 1) > 0.3:
                    skipped_count += 1
                    continue

            # Check if mention already exists
            existing = db.query(BrandMention).filter(
                BrandMention.business_profile_id == business_profile_id,
                BrandMention.source_url == url
            ).first()

            mention_type = MentionDiscoveryService._determine_mention_type(
                url, result['title'], result['snippet']
            )
            sentiment = MentionDiscoveryService._analyze_sentiment(
                result['title'], result['snippet']
            )
            domain = MentionDiscoveryService._extract_domain(url)

            if existing:
                existing.page_title = result['title']
                existing.extracted_snippet = result['snippet']
                existing.mention_type = mention_type
                existing.sentiment = sentiment
                existing.search_query = result['query']
                existing.search_position = result['position']
                existing.discovery_method = result['source'] + '_search'
                existing.updated_at = datetime.utcnow()
                updated_mentions_count += 1
            else:
                mention = BrandMention(
                    business_profile_id=business_profile_id,
                    user_id=user_id,
                    source_url=url,
                    source_domain=domain,
                    canonical_url=url,
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

        db.commit()

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
            "total_mentions": total_mentions,
            "engines_used": engines_used,
            "sentiment_engine": "vader" if HAS_VADER else "rule_based",
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
        return query.order_by(BrandMention.discovered_at.desc()).limit(limit).all()

    @staticmethod
    def get_mention_counts_for_scoring(db: Session, business_profile_id: str) -> Dict:
        """
        Get mention counts broken down by type for GEO scoring.
        Returns dict with total_mentions, directory_count, review_count, etc.
        """
        from sqlalchemy import func

        mentions = db.query(
            BrandMention.mention_type,
            func.count(BrandMention.id)
        ).filter(
            BrandMention.business_profile_id == business_profile_id
        ).group_by(BrandMention.mention_type).all()

        counts = {
            "total_mentions": 0,
            "directory_count": 0,
            "review_count": 0,
            "article_count": 0,
            "blog_count": 0,
            "comparison_count": 0,
            "social_count": 0,
            "other_count": 0,
        }

        for mtype, count in mentions:
            counts["total_mentions"] += count
            key = f"{mtype.value}_count"
            if key in counts:
                counts[key] = count

        return counts
