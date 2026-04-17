"""
Reinforcement API Routes
========================
Endpoints for generating and managing reinforcement tasks.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from loguru import logger

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import User, BusinessProfile
from app.services.reinforcement_service import ReinforcementService

router = APIRouter(prefix="/api/intelligence/reinforce", tags=["Intelligence - Reinforcement"])


class TaskResponse(BaseModel):
    id: str
    gap_issue_id: str
    business_profile_id: str
    action_type: str
    title: str
    description: str
    implementation_hint: Optional[str] = None
    impact: str
    priority_order: int
    status: str
    created_at: Optional[str] = None


class ReinforcementPlanResponse(BaseModel):
    total_tasks: int
    by_impact: Dict[str, int]
    tasks: List[TaskResponse]


class UpdateTaskRequest(BaseModel):
    status: str = Field(..., description="New status: pending, in_progress, completed, skipped")


@router.post("/generate/{business_id}", response_model=ReinforcementPlanResponse)
async def generate_reinforcement_plan(
    business_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate reinforcement action plan from active gap issues."""
    business = db.query(BusinessProfile).filter(
        BusinessProfile.id == business_id,
        BusinessProfile.user_id == current_user.id,
    ).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")

    try:
        svc = ReinforcementService(db)
        tasks = svc.generate_reinforcement_plan(business_id)
        by_impact = {"high": 0, "medium": 0, "low": 0}
        for t in tasks:
            imp = t.get("impact", "")
            if imp in by_impact:
                by_impact[imp] += 1
        return {"total_tasks": len(tasks), "by_impact": by_impact, "tasks": tasks}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating reinforcement plan: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate reinforcement plan")


@router.get("/{business_id}", response_model=ReinforcementPlanResponse)
async def get_reinforcement_tasks(
    business_id: str,
    status_filter: Optional[str] = Query(None, alias="status"),
    impact_filter: Optional[str] = Query(None, alias="impact"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get stored reinforcement tasks."""
    business = db.query(BusinessProfile).filter(
        BusinessProfile.id == business_id,
        BusinessProfile.user_id == current_user.id,
    ).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")

    svc = ReinforcementService(db)
    tasks = svc.get_tasks(business_id, status_filter=status_filter, impact_filter=impact_filter)
    task_dicts = [svc._task_to_dict(t) for t in tasks]
    by_impact = {"high": 0, "medium": 0, "low": 0}
    for t in task_dicts:
        imp = t.get("impact", "")
        if imp in by_impact:
            by_impact[imp] += 1
    return {"total_tasks": len(task_dicts), "by_impact": by_impact, "tasks": task_dicts}


@router.patch("/task/{task_id}", response_model=TaskResponse)
async def update_task_status(
    task_id: str,
    body: UpdateTaskRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a reinforcement task's status."""
    try:
        svc = ReinforcementService(db)
        task = svc.update_task_status(task_id, body.status)
        return svc._task_to_dict(task)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
