"""
BIS Database Manager
====================
Manages the separate bis_db PostgreSQL database for Brand Intelligence System.
Uses its own SQLAlchemy engine, completely independent from geo_db.
"""
import uuid
from datetime import datetime
from typing import List, Dict, Optional, Any
from sqlalchemy import create_engine, text, Column, String, Text, Float, Integer, DateTime, JSON, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from loguru import logger

BISBase = declarative_base()


# ============================================================================
# BIS ORM MODELS (separate Base from geo_db)
# ============================================================================

class BISBrand(BISBase):
    __tablename__ = "bis_brands"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    business_name = Column(String(255), nullable=False)
    category = Column(String(255), default="")
    location = Column(String(255), default="")
    website = Column(String(500), default="")
    geo_business_profile_id = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_scanned_at = Column(DateTime, nullable=True)


class BISMention(BISBase):
    __tablename__ = "bis_mentions"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    brand_id = Column(String(36), ForeignKey("bis_brands.id"), nullable=False, index=True)
    source_type = Column(String(50), nullable=False)
    source_url = Column(String(2048), default="")
    source_domain = Column(String(255), default="")
    title = Column(String(500), default="")
    snippet = Column(Text, default="")
    full_content = Column(Text, nullable=True)
    mention_type = Column(String(50), default="other")
    sentiment = Column(String(20), default="neutral")
    sentiment_score = Column(Float, default=0.0)
    relevance_score = Column(Float, default=0.5)
    discovery_query = Column(String(500), default="")
    discovered_at = Column(DateTime, default=datetime.utcnow)
    metadata_json = Column(JSON, nullable=True)


class BISScrapingLog(BISBase):
    __tablename__ = "bis_scraping_logs"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    brand_id = Column(String(36), ForeignKey("bis_brands.id"), nullable=False, index=True)
    source_type = Column(String(50), nullable=False)
    status = Column(String(20), default="started")
    queries_executed = Column(Integer, default=0)
    results_found = Column(Integer, default=0)
    results_stored = Column(Integer, default=0)
    duration_ms = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


# ============================================================================
# BIS DATABASE MANAGER
# ============================================================================

class BISDatabaseManager:
    """Manages the separate bis_db database."""

    def __init__(self, database_url: str):
        if not database_url:
            raise ValueError("BIS_DATABASE_URL is not configured")
        self.engine = create_engine(database_url, pool_pre_ping=True, pool_size=5)
        self.SessionLocal = sessionmaker(bind=self.engine)

    def init_db(self):
        """Create all BIS tables if they don't exist."""
        BISBase.metadata.create_all(self.engine)
        logger.info("BIS database tables initialized")

    def get_session(self) -> Session:
        return self.SessionLocal()

    # ------------------------------------------------------------------
    # Brand operations
    # ------------------------------------------------------------------

    def upsert_brand(self, name: str, category: str = "", location: str = "",
                     website: str = "", geo_profile_id: str = None) -> Dict:
        session = self.get_session()
        try:
            brand = session.query(BISBrand).filter(
                BISBrand.business_name == name,
                BISBrand.geo_business_profile_id == geo_profile_id,
            ).first()
            if brand:
                brand.category = category
                brand.location = location
                brand.website = website
            else:
                brand = BISBrand(
                    business_name=name,
                    category=category,
                    location=location,
                    website=website,
                    geo_business_profile_id=geo_profile_id,
                )
                session.add(brand)
            session.commit()
            session.refresh(brand)
            return self._brand_to_dict(brand)
        finally:
            session.close()

    def get_brand_by_geo_id(self, geo_profile_id: str) -> Optional[Dict]:
        session = self.get_session()
        try:
            brand = session.query(BISBrand).filter(
                BISBrand.geo_business_profile_id == geo_profile_id
            ).first()
            return self._brand_to_dict(brand) if brand else None
        finally:
            session.close()

    def get_all_brands(self) -> List[Dict]:
        session = self.get_session()
        try:
            brands = session.query(BISBrand).order_by(BISBrand.created_at.desc()).all()
            return [self._brand_to_dict(b) for b in brands]
        finally:
            session.close()

    def update_last_scanned(self, brand_id: str):
        session = self.get_session()
        try:
            brand = session.query(BISBrand).filter(BISBrand.id == brand_id).first()
            if brand:
                brand.last_scanned_at = datetime.utcnow()
                session.commit()
        finally:
            session.close()

    # ------------------------------------------------------------------
    # Mention operations
    # ------------------------------------------------------------------

    def store_mention(self, brand_id: str, mention_data: Dict) -> Dict:
        session = self.get_session()
        try:
            mention = BISMention(
                brand_id=brand_id,
                source_type=mention_data.get("source_type", "unknown"),
                source_url=mention_data.get("source_url", ""),
                source_domain=mention_data.get("source_domain", ""),
                title=mention_data.get("title", ""),
                snippet=mention_data.get("snippet", ""),
                full_content=mention_data.get("full_content"),
                mention_type=mention_data.get("mention_type", "other"),
                sentiment=mention_data.get("sentiment", "neutral"),
                sentiment_score=mention_data.get("sentiment_score", 0.0),
                relevance_score=mention_data.get("relevance_score", 0.5),
                discovery_query=mention_data.get("discovery_query", ""),
                metadata_json=mention_data.get("metadata"),
            )
            session.add(mention)
            session.commit()
            session.refresh(mention)
            return self._mention_to_dict(mention)
        finally:
            session.close()

    def get_brand_mentions(self, brand_id: str, source_type: str = None,
                           mention_type: str = None, sentiment: str = None,
                           limit: int = 200) -> List[Dict]:
        session = self.get_session()
        try:
            q = session.query(BISMention).filter(BISMention.brand_id == brand_id)
            if source_type:
                q = q.filter(BISMention.source_type == source_type)
            if mention_type:
                q = q.filter(BISMention.mention_type == mention_type)
            if sentiment:
                q = q.filter(BISMention.sentiment == sentiment)
            mentions = q.order_by(BISMention.discovered_at.desc()).limit(limit).all()
            return [self._mention_to_dict(m) for m in mentions]
        finally:
            session.close()

    def get_brand_stats(self, brand_id: str) -> Dict:
        session = self.get_session()
        try:
            mentions = session.query(BISMention).filter(BISMention.brand_id == brand_id).all()
            by_source: Dict[str, int] = {}
            by_type: Dict[str, int] = {}
            by_sentiment: Dict[str, int] = {}
            domains: Dict[str, int] = {}
            for m in mentions:
                by_source[m.source_type] = by_source.get(m.source_type, 0) + 1
                by_type[m.mention_type] = by_type.get(m.mention_type, 0) + 1
                by_sentiment[m.sentiment] = by_sentiment.get(m.sentiment, 0) + 1
                if m.source_domain:
                    domains[m.source_domain] = domains.get(m.source_domain, 0) + 1
            top_domains = sorted(domains.items(), key=lambda x: x[1], reverse=True)[:10]
            return {
                "total_mentions": len(mentions),
                "by_source": by_source,
                "by_type": by_type,
                "by_sentiment": by_sentiment,
                "top_domains": [{"domain": d, "count": c} for d, c in top_domains],
            }
        finally:
            session.close()

    # ------------------------------------------------------------------
    # Scraping log operations
    # ------------------------------------------------------------------

    def log_scrape(self, brand_id: str, source_type: str, status: str,
                   queries_executed: int = 0, results_found: int = 0,
                   results_stored: int = 0, duration_ms: int = 0,
                   error_message: str = None) -> Dict:
        session = self.get_session()
        try:
            log_entry = BISScrapingLog(
                brand_id=brand_id,
                source_type=source_type,
                status=status,
                queries_executed=queries_executed,
                results_found=results_found,
                results_stored=results_stored,
                duration_ms=duration_ms,
                error_message=error_message,
                completed_at=datetime.utcnow() if status in ("completed", "failed") else None,
            )
            session.add(log_entry)
            session.commit()
            session.refresh(log_entry)
            return self._log_to_dict(log_entry)
        finally:
            session.close()

    def get_scraping_history(self, brand_id: str) -> List[Dict]:
        session = self.get_session()
        try:
            logs = session.query(BISScrapingLog).filter(
                BISScrapingLog.brand_id == brand_id
            ).order_by(BISScrapingLog.started_at.desc()).all()
            return [self._log_to_dict(l) for l in logs]
        finally:
            session.close()

    # ------------------------------------------------------------------
    # Serialization helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _brand_to_dict(brand: BISBrand) -> Dict:
        return {
            "id": brand.id,
            "business_name": brand.business_name,
            "category": brand.category,
            "location": brand.location,
            "website": brand.website,
            "geo_business_profile_id": brand.geo_business_profile_id,
            "created_at": brand.created_at.isoformat() if brand.created_at else None,
            "last_scanned_at": brand.last_scanned_at.isoformat() if brand.last_scanned_at else None,
        }

    @staticmethod
    def _mention_to_dict(mention: BISMention) -> Dict:
        return {
            "id": mention.id,
            "brand_id": mention.brand_id,
            "source_type": mention.source_type,
            "source_url": mention.source_url,
            "source_domain": mention.source_domain,
            "title": mention.title,
            "snippet": mention.snippet,
            "full_content": mention.full_content,
            "mention_type": mention.mention_type,
            "sentiment": mention.sentiment,
            "sentiment_score": mention.sentiment_score,
            "relevance_score": mention.relevance_score,
            "discovery_query": mention.discovery_query,
            "discovered_at": mention.discovered_at.isoformat() if mention.discovered_at else None,
            "metadata": mention.metadata_json,
        }

    @staticmethod
    def _log_to_dict(log: BISScrapingLog) -> Dict:
        return {
            "id": log.id,
            "brand_id": log.brand_id,
            "source_type": log.source_type,
            "status": log.status,
            "queries_executed": log.queries_executed,
            "results_found": log.results_found,
            "results_stored": log.results_stored,
            "duration_ms": log.duration_ms,
            "error_message": log.error_message,
            "started_at": log.started_at.isoformat() if log.started_at else None,
            "completed_at": log.completed_at.isoformat() if log.completed_at else None,
        }
