"""
BIS API Routes
==============
Brand Intelligence System — separate from the main intelligence pipeline.
6 endpoints under /api/bis/.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from loguru import logger

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import User, BusinessProfile
from app.services.bis_adapter import BISAdapter

router = APIRouter(prefix="/api/bis", tags=["BIS - Brand Intelligence System"])


def _get_adapter(db: Session) -> BISAdapter:
    try:
        return BISAdapter(geo_db=db)
    except ValueError as e:
        raise HTTPException(status_code=503, detail=f"BIS not configured: {e}")


@router.post("/scan/{business_id}")
async def start_bis_scan(
    business_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Trigger a full BIS scan for a business. Queries all configured sources."""
    business = db.query(BusinessProfile).filter(
        BusinessProfile.id == business_id,
        BusinessProfile.user_id == current_user.id,
    ).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")

    try:
        adapter = _get_adapter(db)
        result = adapter.run_bis_scan(business_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"BIS scan error: {e}")
        raise HTTPException(status_code=500, detail="BIS scan failed")


@router.get("/results/{business_id}")
async def get_bis_results(
    business_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all BIS mentions, stats, and logs for a business."""
    business = db.query(BusinessProfile).filter(
        BusinessProfile.id == business_id,
        BusinessProfile.user_id == current_user.id,
    ).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")

    adapter = _get_adapter(db)
    return adapter.get_bis_results(business_id)


@router.get("/brands")
async def list_bis_brands(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all brands ever scanned in BIS (multi-brand browsing)."""
    adapter = _get_adapter(db)
    return {"brands": adapter.get_all_brands()}


@router.get("/brand/{brand_id}/mentions")
async def get_brand_mentions(
    brand_id: str,
    source_type: Optional[str] = Query(None),
    mention_type: Optional[str] = Query(None),
    sentiment: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get mentions for a specific BIS brand with optional filters."""
    adapter = _get_adapter(db)
    mentions = adapter.get_brand_mentions(brand_id, source_type, mention_type, sentiment)
    return {"total": len(mentions), "mentions": mentions}


@router.get("/brand/{brand_id}/stats")
async def get_brand_stats(
    brand_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get aggregated stats for a BIS brand."""
    adapter = _get_adapter(db)
    return adapter.get_brand_stats(brand_id)


@router.get("/brand/{brand_id}/logs")
async def get_scraping_logs(
    brand_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get scraping history for a BIS brand."""
    adapter = _get_adapter(db)
    logs = adapter.get_scraping_logs(brand_id)
    return {"total": len(logs), "logs": logs}
