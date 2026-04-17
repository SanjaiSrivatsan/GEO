"""
Simulation API Routes
=====================
Endpoints for running prompt simulations and viewing results.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from loguru import logger

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import User, BusinessProfile
from app.services.prompt_simulation_service import PromptSimulationService

router = APIRouter(prefix="/api/intelligence/simulate", tags=["Intelligence - Prompt Simulation"])


class SimulationConfig(BaseModel):
    prompt_ids: Optional[List[str]] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None


class SimulationRunResponse(BaseModel):
    id: str
    business_profile_id: str
    user_id: str
    run_type: str
    total_prompts: int
    mentioned_count: int
    not_mentioned_count: int
    avg_confidence: Optional[float] = None
    total_duration_ms: int
    prompt_results_snapshot: List[Dict[str, Any]] = []
    config_overrides: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None
    completed_at: Optional[str] = None


class SimulationListResponse(BaseModel):
    total_runs: int
    runs: List[SimulationRunResponse]


@router.post("/run/{business_id}", response_model=SimulationRunResponse)
async def run_simulation(
    business_id: str,
    config: Optional[SimulationConfig] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run a prompt simulation for a business."""
    business = db.query(BusinessProfile).filter(
        BusinessProfile.id == business_id,
        BusinessProfile.user_id == current_user.id,
    ).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")

    try:
        svc = PromptSimulationService(db)
        cfg = {}
        prompt_ids = None
        if config:
            prompt_ids = config.prompt_ids
            if config.temperature is not None:
                cfg["temperature"] = config.temperature
            if config.max_tokens is not None:
                cfg["max_tokens"] = config.max_tokens

        result = svc.run_simulation(
            business_profile_id=business_id,
            user_id=str(current_user.id),
            prompt_ids=prompt_ids,
            config=cfg if cfg else None,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Simulation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to run simulation")


@router.get("/runs/{business_id}", response_model=SimulationListResponse)
async def get_simulation_runs(
    business_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all simulation runs for a business."""
    business = db.query(BusinessProfile).filter(
        BusinessProfile.id == business_id,
        BusinessProfile.user_id == current_user.id,
    ).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")

    svc = PromptSimulationService(db)
    runs = svc.get_simulation_runs(business_id)
    return {
        "total_runs": len(runs),
        "runs": [r.to_dict() for r in runs],
    }


@router.get("/run/{run_id}", response_model=SimulationRunResponse)
async def get_simulation_run(
    run_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single simulation run details."""
    svc = PromptSimulationService(db)
    run = svc.get_simulation_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Simulation run not found")
    return run.to_dict()
