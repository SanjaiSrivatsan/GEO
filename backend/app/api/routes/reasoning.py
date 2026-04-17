"""
Reasoning & Drift API Routes
=============================
Endpoints for reasoning decoder and drift monitoring.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from loguru import logger

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import User, BusinessProfile
from app.services.reasoning_decoder_service import ReasoningDecoderService

router = APIRouter(prefix="/api/intelligence/reasoning", tags=["Intelligence - Reasoning Decoder"])


class ReasoningAnalysisResponse(BaseModel):
    id: str
    business_profile_id: str
    simulation_run_id: str
    prompt_id: str
    root_cause: str
    missing_signals: List[Dict[str, Any]] = []
    reinforcement_class: str
    suggested_actions: List[str] = []
    confidence: Optional[float] = None
    analyzed_at: Optional[str] = None


class ReasoningListResponse(BaseModel):
    total: int
    analyses: List[ReasoningAnalysisResponse]


class DriftReportResponse(BaseModel):
    has_drift: bool
    alerts: List[Dict[str, Any]] = []
    entity_version: Optional[int] = None
    simulation_runs_compared: int
    mention_rate_trend: List[Dict[str, Any]] = []
    confidence_trend: List[Dict[str, Any]] = []


@router.post("/analyze/{business_id}")
async def analyze_non_mentions(
    business_id: str,
    simulation_run_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Analyze non-mentions from a simulation run."""
    business = db.query(BusinessProfile).filter(
        BusinessProfile.id == business_id,
        BusinessProfile.user_id == current_user.id,
    ).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")

    try:
        svc = ReasoningDecoderService(db)
        analyses = svc.analyze_non_mentions(business_id, simulation_run_id)
        return {"total": len(analyses), "analyses": analyses}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Reasoning analysis error: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze non-mentions")


@router.get("/{business_id}", response_model=ReasoningListResponse)
async def get_reasoning_analyses(
    business_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get stored reasoning analyses for a business."""
    business = db.query(BusinessProfile).filter(
        BusinessProfile.id == business_id,
        BusinessProfile.user_id == current_user.id,
    ).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")

    svc = ReasoningDecoderService(db)
    analyses = svc.get_analyses(business_id)
    return {
        "total": len(analyses),
        "analyses": [a.to_dict() for a in analyses],
    }


@router.get("/drift/{business_id}", response_model=DriftReportResponse)
async def get_drift_report(
    business_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get drift report comparing simulation runs and entity versions."""
    business = db.query(BusinessProfile).filter(
        BusinessProfile.id == business_id,
        BusinessProfile.user_id == current_user.id,
    ).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")

    svc = ReasoningDecoderService(db)
    return svc.compute_drift(business_id)
