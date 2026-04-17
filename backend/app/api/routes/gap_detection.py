"""
Gap Detection API Routes
========================
Endpoints for running gap detection and retrieving issues.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from loguru import logger

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import User, BusinessProfile
from app.services.gap_detection_service import GapDetectionService

router = APIRouter(prefix="/api/intelligence/gaps", tags=["Intelligence - Gap Detection"])


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================

class GapIssueResponse(BaseModel):
    id: str
    business_profile_id: str
    canonical_entity_id: str
    gap_type: str
    severity: str
    status: str
    title: str
    description: str
    evidence: Dict[str, Any] = {}
    affected_dimensions: List[str] = []
    detected_at: Optional[str] = None
    resolved_at: Optional[str] = None


class GapDetectionResult(BaseModel):
    total_issues: int
    critical: int
    high: int
    medium: int
    low: int
    issues: List[GapIssueResponse]


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/detect/{business_id}", response_model=GapDetectionResult)
async def detect_gaps(
    business_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run gap detection against the canonical entity and website content."""
    business = db.query(BusinessProfile).filter(
        BusinessProfile.id == business_id,
        BusinessProfile.user_id == current_user.id,
    ).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")

    try:
        svc = GapDetectionService(db)
        issues = svc.detect_all_gaps(business_id)
        severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        for i in issues:
            sev = i.get("severity", "")
            if sev in severity_counts:
                severity_counts[sev] += 1
        return {
            "total_issues": len(issues),
            **severity_counts,
            "issues": issues,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error detecting gaps: {e}")
        raise HTTPException(status_code=500, detail="Failed to run gap detection")


@router.get("/{business_id}", response_model=GapDetectionResult)
async def get_gap_issues(
    business_id: str,
    severity: Optional[str] = Query(None, description="Filter by severity"),
    gap_type: Optional[str] = Query(None, description="Filter by gap type"),
    status: Optional[str] = Query(None, description="Filter by status", alias="gap_status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get stored gap issues for a business."""
    business = db.query(BusinessProfile).filter(
        BusinessProfile.id == business_id,
        BusinessProfile.user_id == current_user.id,
    ).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")

    svc = GapDetectionService(db)
    issues = svc.get_gap_issues(business_id, severity=severity, gap_type=gap_type, status=status)
    issue_dicts = [svc._issue_to_dict(i) for i in issues]
    severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for i in issue_dicts:
        sev = i.get("severity", "")
        if sev in severity_counts:
            severity_counts[sev] += 1
    return {
        "total_issues": len(issue_dicts),
        **severity_counts,
        "issues": issue_dicts,
    }
