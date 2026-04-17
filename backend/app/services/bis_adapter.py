"""
BIS Adapter Service
===================
Orchestrates BIS scans using the existing API clients from mention_discovery_service.
Stores results in bis_db via BISDatabaseManager, and dual-writes to geo_db BrandMentions.
"""
import time
from datetime import datetime
from typing import Dict, List, Optional
from urllib.parse import urlparse
from sqlalchemy.orm import Session
from loguru import logger

from app.models.business_profile import BusinessProfile
from app.models.brand_mention import BrandMention, MentionType, MentionStatus, SentimentType
from app.services.bis_db_manager import BISDatabaseManager
from app.services.mention_discovery_service import (
    SearchQueryGenerator,
    GoogleCSEClient,
    YouTubeAPIClient,
    NewsAPIClient,
    JustDialMentionFetcher,
    SearchResultScraper,
)
from app.config import Settings

# VADER sentiment (optional)
try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    _vader = SentimentIntensityAnalyzer()
    HAS_VADER = True
except ImportError:
    _vader = None
    HAS_VADER = False


def _analyze_sentiment(text: str) -> tuple:
    """Returns (sentiment_label, sentiment_score)."""
    if HAS_VADER and _vader:
        scores = _vader.polarity_scores(text)
        compound = scores["compound"]
        if compound >= 0.05:
            return "positive", compound
        elif compound <= -0.05:
            return "negative", compound
        return "neutral", compound
    # Simple fallback
    text_lower = text.lower()
    positive_words = {"great", "excellent", "best", "good", "amazing", "recommend", "love", "top"}
    negative_words = {"bad", "poor", "worst", "terrible", "avoid", "scam", "fake", "horrible"}
    pos = sum(1 for w in positive_words if w in text_lower)
    neg = sum(1 for w in negative_words if w in text_lower)
    if pos > neg:
        return "positive", 0.5
    elif neg > pos:
        return "negative", -0.5
    return "neutral", 0.0


def _classify_mention_type(source: str, url: str, title: str) -> str:
    """Classify mention type based on source and URL patterns."""
    url_lower = url.lower()
    title_lower = title.lower()
    if source == "youtube":
        return "video"
    if source == "newsapi":
        return "news"
    if source == "justdial":
        return "directory"
    directory_domains = {"yelp.com", "yellowpages.com", "tripadvisor.com", "justdial.com", "glassdoor.com", "indeed.com"}
    domain = urlparse(url).netloc.replace("www.", "").lower()
    if domain in directory_domains:
        return "directory"
    if any(w in url_lower for w in ["review", "rating", "testimonial"]):
        return "review"
    if any(w in title_lower for w in ["review", "rating", "comparison", "vs", "versus"]):
        return source == "newsapi" and "news" or "comparison" if "vs" in title_lower or "versus" in title_lower else "review"
    if any(w in url_lower for w in ["blog", "article", "news", "press"]):
        return "article"
    return "other"


def _extract_domain(url: str) -> str:
    try:
        parsed = urlparse(url)
        return (parsed.netloc or "").replace("www.", "").lower()
    except Exception:
        return ""


class BISAdapter:
    """Orchestrates a full BIS scan for a business."""

    def __init__(self, geo_db: Session, bis_db_url: str = None):
        self.geo_db = geo_db
        settings = Settings()
        url = bis_db_url or settings.BIS_DATABASE_URL
        self.bis_mgr = BISDatabaseManager(url)
        self.bis_mgr.init_db()

    def run_bis_scan(self, business_profile_id: str) -> Dict:
        """Full BIS scan: query all sources, store in bis_db + geo_db."""
        # 1. Load business from geo_db
        biz = self.geo_db.query(BusinessProfile).filter(
            BusinessProfile.id == business_profile_id
        ).first()
        if not biz:
            raise ValueError(f"Business profile {business_profile_id} not found")

        # 2. Upsert brand in bis_db
        brand = self.bis_mgr.upsert_brand(
            name=biz.name,
            category=biz.category or "",
            location=biz.primary_location or "",
            website=biz.website or "",
            geo_profile_id=str(biz.id),
        )
        brand_id = brand["id"]

        # 3. Generate queries
        queries = SearchQueryGenerator.generate_queries(
            biz.name, biz.category or "", biz.primary_location or "", biz.website
        )
        # Use top 5 queries to limit API calls
        queries = queries[:5]

        # 4. Scan each source
        scan_results = {}
        total_mentions = 0

        for source_name, scanner_fn in [
            ("google_cse", lambda q: self._scan_google_cse(brand_id, q)),
            ("youtube", lambda q: self._scan_youtube(brand_id, q)),
            ("newsapi", lambda q: self._scan_newsapi(brand_id, q)),
            ("justdial", lambda _: self._scan_justdial(brand_id, biz.name, biz.primary_location or "")),
            ("web_search", lambda q: self._scan_web_search(brand_id, q)),
        ]:
            try:
                result = scanner_fn(queries)
                scan_results[source_name] = result
                total_mentions += result.get("stored", 0)
                # Dual-write to geo_db
                for mention_data in result.get("mentions", []):
                    self._dual_write_to_geo(business_profile_id, mention_data)
            except Exception as e:
                logger.error(f"BIS scan {source_name} error: {e}")
                scan_results[source_name] = {"found": 0, "stored": 0, "error": str(e)}

        # 5. Update last scanned
        self.bis_mgr.update_last_scanned(brand_id)

        return {
            "brand_id": brand_id,
            "business_profile_id": business_profile_id,
            "business_name": biz.name,
            "total_mentions": total_mentions,
            "sources": scan_results,
            "scanned_at": datetime.utcnow().isoformat(),
        }

    # ------------------------------------------------------------------
    # Source scanners
    # ------------------------------------------------------------------

    def _scan_google_cse(self, brand_id: str, queries: List[str]) -> Dict:
        start = time.time()
        all_results = []
        stored = 0
        for q in queries[:3]:
            try:
                results = GoogleCSEClient.search(q, max_results=5)
                all_results.extend(results)
            except Exception as e:
                logger.warning(f"Google CSE query failed: {e}")
        mentions = []
        seen_urls = set()
        for r in all_results:
            url = r.get("url", "")
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            sentiment, score = _analyze_sentiment(f"{r.get('title', '')} {r.get('snippet', '')}")
            mdata = {
                "source_type": "google_cse",
                "source_url": url,
                "source_domain": _extract_domain(url),
                "title": r.get("title", "")[:500],
                "snippet": r.get("snippet", "")[:2000],
                "mention_type": _classify_mention_type("google_cse", url, r.get("title", "")),
                "sentiment": sentiment,
                "sentiment_score": score,
                "relevance_score": 0.7,
                "discovery_query": queries[0] if queries else "",
            }
            self.bis_mgr.store_mention(brand_id, mdata)
            mentions.append(mdata)
            stored += 1
        duration_ms = int((time.time() - start) * 1000)
        self.bis_mgr.log_scrape(brand_id, "google_cse", "completed",
                                queries_executed=min(len(queries), 3),
                                results_found=len(all_results), results_stored=stored,
                                duration_ms=duration_ms)
        return {"found": len(all_results), "stored": stored, "mentions": mentions}

    def _scan_youtube(self, brand_id: str, queries: List[str]) -> Dict:
        start = time.time()
        all_results = []
        stored = 0
        for q in queries[:2]:
            try:
                results = YouTubeAPIClient.search(q, max_results=5)
                all_results.extend(results)
            except Exception as e:
                logger.warning(f"YouTube query failed: {e}")
        mentions = []
        seen_urls = set()
        for r in all_results:
            url = r.get("url", "")
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            sentiment, score = _analyze_sentiment(f"{r.get('title', '')} {r.get('snippet', '')}")
            mdata = {
                "source_type": "youtube",
                "source_url": url,
                "source_domain": "youtube.com",
                "title": r.get("title", "")[:500],
                "snippet": r.get("snippet", "")[:2000],
                "mention_type": "video",
                "sentiment": sentiment,
                "sentiment_score": score,
                "relevance_score": 0.6,
                "discovery_query": queries[0] if queries else "",
            }
            self.bis_mgr.store_mention(brand_id, mdata)
            mentions.append(mdata)
            stored += 1
        duration_ms = int((time.time() - start) * 1000)
        self.bis_mgr.log_scrape(brand_id, "youtube", "completed",
                                queries_executed=min(len(queries), 2),
                                results_found=len(all_results), results_stored=stored,
                                duration_ms=duration_ms)
        return {"found": len(all_results), "stored": stored, "mentions": mentions}

    def _scan_newsapi(self, brand_id: str, queries: List[str]) -> Dict:
        start = time.time()
        all_results = []
        stored = 0
        for q in queries[:2]:
            try:
                results = NewsAPIClient.search(q, max_results=5)
                all_results.extend(results)
            except Exception as e:
                logger.warning(f"NewsAPI query failed: {e}")
        mentions = []
        seen_urls = set()
        for r in all_results:
            url = r.get("url", "")
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            sentiment, score = _analyze_sentiment(f"{r.get('title', '')} {r.get('snippet', '')}")
            mdata = {
                "source_type": "newsapi",
                "source_url": url,
                "source_domain": _extract_domain(url),
                "title": r.get("title", "")[:500],
                "snippet": r.get("snippet", "")[:2000],
                "mention_type": "news",
                "sentiment": sentiment,
                "sentiment_score": score,
                "relevance_score": 0.65,
                "discovery_query": queries[0] if queries else "",
            }
            self.bis_mgr.store_mention(brand_id, mdata)
            mentions.append(mdata)
            stored += 1
        duration_ms = int((time.time() - start) * 1000)
        self.bis_mgr.log_scrape(brand_id, "newsapi", "completed",
                                queries_executed=min(len(queries), 2),
                                results_found=len(all_results), results_stored=stored,
                                duration_ms=duration_ms)
        return {"found": len(all_results), "stored": stored, "mentions": mentions}

    def _scan_justdial(self, brand_id: str, business_name: str, location: str) -> Dict:
        start = time.time()
        mentions = []
        stored = 0
        try:
            results = JustDialMentionFetcher.search(business_name, location, max_results=5)
            seen_urls = set()
            for r in results:
                url = r.get("url", "")
                if not url or url in seen_urls:
                    continue
                seen_urls.add(url)
                sentiment, score = _analyze_sentiment(f"{r.get('title', '')} {r.get('snippet', '')}")
                mdata = {
                    "source_type": "justdial",
                    "source_url": url,
                    "source_domain": _extract_domain(url),
                    "title": r.get("title", "")[:500],
                    "snippet": r.get("snippet", "")[:2000],
                    "mention_type": "directory",
                    "sentiment": sentiment,
                    "sentiment_score": score,
                    "relevance_score": 0.5,
                    "discovery_query": business_name,
                }
                self.bis_mgr.store_mention(brand_id, mdata)
                mentions.append(mdata)
                stored += 1
        except Exception as e:
            logger.warning(f"JustDial scan failed: {e}")
        duration_ms = int((time.time() - start) * 1000)
        self.bis_mgr.log_scrape(brand_id, "justdial", "completed",
                                queries_executed=1,
                                results_found=len(mentions), results_stored=stored,
                                duration_ms=duration_ms)
        return {"found": len(mentions), "stored": stored, "mentions": mentions}

    def _scan_web_search(self, brand_id: str, queries: List[str]) -> Dict:
        start = time.time()
        all_results = []
        stored = 0
        scraper = SearchResultScraper()
        for q in queries[:3]:
            try:
                results = scraper.search_google(q, max_results=5)
                all_results.extend(results)
            except Exception as e:
                logger.warning(f"Web search query failed: {e}")
        mentions = []
        seen_urls = set()
        for r in all_results:
            url = r.get("url", "")
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            sentiment, score = _analyze_sentiment(f"{r.get('title', '')} {r.get('snippet', '')}")
            mdata = {
                "source_type": "web_search",
                "source_url": url,
                "source_domain": _extract_domain(url),
                "title": r.get("title", "")[:500],
                "snippet": r.get("snippet", "")[:2000],
                "mention_type": _classify_mention_type("web_search", url, r.get("title", "")),
                "sentiment": sentiment,
                "sentiment_score": score,
                "relevance_score": 0.55,
                "discovery_query": queries[0] if queries else "",
            }
            self.bis_mgr.store_mention(brand_id, mdata)
            mentions.append(mdata)
            stored += 1
        duration_ms = int((time.time() - start) * 1000)
        self.bis_mgr.log_scrape(brand_id, "web_search", "completed",
                                queries_executed=min(len(queries), 3),
                                results_found=len(all_results), results_stored=stored,
                                duration_ms=duration_ms)
        return {"found": len(all_results), "stored": stored, "mentions": mentions}

    # ------------------------------------------------------------------
    # Dual write to geo_db
    # ------------------------------------------------------------------

    def _dual_write_to_geo(self, business_profile_id: str, mention_data: Dict):
        """Also store mention in geo_db BrandMentions for GEO scoring."""
        try:
            existing = self.geo_db.query(BrandMention).filter(
                BrandMention.business_profile_id == business_profile_id,
                BrandMention.source_url == mention_data.get("source_url", ""),
            ).first()
            if existing:
                return

            # Map to GEO enums
            stype = mention_data.get("mention_type", "other")
            type_map = {
                "directory": MentionType.DIRECTORY,
                "review": MentionType.REVIEW,
                "article": MentionType.ARTICLE,
                "video": MentionType.ARTICLE,
                "news": MentionType.ARTICLE,
                "social": MentionType.SOCIAL,
                "comparison": MentionType.ARTICLE,
            }
            sent_map = {
                "positive": SentimentType.POSITIVE,
                "neutral": SentimentType.NEUTRAL,
                "negative": SentimentType.NEGATIVE,
            }

            mention = BrandMention(
                business_profile_id=business_profile_id,
                source_url=mention_data.get("source_url", ""),
                source_domain=mention_data.get("source_domain", ""),
                page_title=mention_data.get("title", ""),
                extracted_snippet=mention_data.get("snippet", "")[:500],
                mention_type=type_map.get(stype, MentionType.OTHER),
                sentiment=sent_map.get(mention_data.get("sentiment", "neutral"), SentimentType.NEUTRAL),
                status=MentionStatus.ACTIVE,
                search_query=mention_data.get("discovery_query", ""),
                discovery_method=f"bis_{mention_data.get('source_type', 'unknown')}",
            )
            self.geo_db.add(mention)
            self.geo_db.commit()
        except Exception as e:
            self.geo_db.rollback()
            logger.debug(f"Dual-write to geo_db failed: {e}")

    # ------------------------------------------------------------------
    # Read operations
    # ------------------------------------------------------------------

    def get_bis_results(self, business_profile_id: str) -> Dict:
        brand = self.bis_mgr.get_brand_by_geo_id(business_profile_id)
        if not brand:
            return {"brand": None, "mentions": [], "stats": {}, "logs": []}
        brand_id = brand["id"]
        return {
            "brand": brand,
            "mentions": self.bis_mgr.get_brand_mentions(brand_id),
            "stats": self.bis_mgr.get_brand_stats(brand_id),
            "logs": self.bis_mgr.get_scraping_history(brand_id),
        }

    def get_all_brands(self) -> List[Dict]:
        return self.bis_mgr.get_all_brands()

    def get_brand_mentions(self, brand_id: str, source_type: str = None,
                           mention_type: str = None, sentiment: str = None) -> List[Dict]:
        return self.bis_mgr.get_brand_mentions(brand_id, source_type, mention_type, sentiment)

    def get_brand_stats(self, brand_id: str) -> Dict:
        return self.bis_mgr.get_brand_stats(brand_id)

    def get_scraping_logs(self, brand_id: str) -> List[Dict]:
        return self.bis_mgr.get_scraping_history(brand_id)
