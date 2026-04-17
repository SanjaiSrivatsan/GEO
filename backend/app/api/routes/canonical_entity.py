"""
Canonical Entity API Routes
===========================
Endpoints for building and retrieving the canonical business entity.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from loguru import logger

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import User, BusinessProfile
from app.services.canonical_entity_service import CanonicalEntityService

router = APIRouter(prefix="/api/intelligence/canonical", tags=["Intelligence - Canonical Entity"])


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================

class CanonicalEntityResponse(BaseModel):
    id: str
    business_profile_id: str
    primary_category: str
    secondary_categories: List[str] = []
    services: List[Dict[str, Any]] = []
    positioning_statement: Optional[str] = None
    icp: Dict[str, Any] = {}
    geo_scope: Dict[str, Any] = {}
    approved_terms: List[str] = []
    vocabulary_clusters: List[Dict[str, Any]] = []
    version: int
    computed_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/build/{business_id}", response_model=CanonicalEntityResponse)
async def build_canonical_entity(
    business_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Build (or rebuild) the canonical entity from completed prompt results."""
    # Verify ownership
    business = db.query(BusinessProfile).filter(
        BusinessProfile.id == business_id,
        BusinessProfile.user_id == current_user.id,
    ).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")

    try:
        svc = CanonicalEntityService(db)
        entity = svc.build_canonical_entity(business_id)
        return entity.to_dict()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error building canonical entity: {e}")
        raise HTTPException(status_code=500, detail="Failed to build canonical entity")


@router.get("/{business_id}", response_model=CanonicalEntityResponse)
async def get_canonical_entity(
    business_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the latest canonical entity for a business."""
    business = db.query(BusinessProfile).filter(
        BusinessProfile.id == business_id,
        BusinessProfile.user_id == current_user.id,
    ).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")

    svc = CanonicalEntityService(db)
    entity = svc.get_canonical_entity(business_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Canonical entity not built yet. Run build first.")
    return entity.to_dict()
