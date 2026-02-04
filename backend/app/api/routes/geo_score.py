"""
GEO Scoring API Routes - Step 16
Endpoints for computing and retrieving GEO scores.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from loguru import logger

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models import User, BusinessProfile, GeoScore
from app.services.geo_scoring_service import GeoScoringService

router = APIRouter(prefix="/api/geo/score", tags=["GEO Scoring"])


# ============================================================================
# REQUEST/RESPONSE SCHEMAS
# ============================================================================

class ComputeScoreRequest(BaseModel):
    """Request to compute GEO score for a business"""
    entity_id: str = Field(..., description="Business profile ID (entity_id)")


class ScoreBreakdown(BaseModel):
    """Detailed breakdown of a score component"""
    score: float
    weight: float
    contribution: float
    details: Optional[Dict[str, Any]] = None


class GeoScoreResponse(BaseModel):
    """Response containing GEO score with full breakdown"""
    score_id: str
    business_profile_id: str
    business_name: str
    
    # Core scores
    presence_score: float
    accuracy_score: float
    trust_score: float
    hallucination_penalty: float
    final_geo_score: float
    
    # Detailed breakdowns
    presence_breakdown: Optional[Dict[str, Any]] = None
    accuracy_breakdown: Optional[Dict[str, Any]] = None
    trust_breakdown: Optional[Dict[str, Any]] = None
    hallucination_breakdown: Optional[Dict[str, Any]] = None
    
    # Metadata
    prompt_results_count: int
    computation_method: str
    computed_at: str
    
    # Explanation
    formula: str
    calculation: Dict[str, Any]
    total_calculation_string: str
    
    class Config:
        from_attributes = True


# ============================================================================
# API ENDPOINTS
# ============================================================================

@router.post("/compute", response_model=GeoScoreResponse, status_code=status.HTTP_200_OK)
async def compute_geo_score(
    request: ComputeScoreRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Compute GEO score for a business entity.
    
    This endpoint triggers the deterministic scoring engine to analyze all completed
    prompt results and produce a normalized GEO score (0-100) with full breakdowns.
    
    **Scoring Formula:**
    ```
    GEO_SCORE = (Presence × 0.35) + (Accuracy × 0.35) + (Trust × 0.20) + HallucinationPenalty
    ```
    
    **Score Components:**
    - **Presence Score (35%):** Brand mentions, directory listings, local citations
    - **Accuracy Score (35%):** NAP consistency, category alignment, service accuracy
    - **Trust Score (20%):** Review sentiment, volume, trust signals
    - **Hallucination Penalty (-10 to 0):** Uncited claims, low confidence, contradictions
    
    **Requirements:**
    - User must own the business profile
    - At least one completed prompt result must exist (run Step 15 first)
    
    **Returns:**
    - Full score breakdown with transparent calculations
    - JSON details for each dimension
    - Computation metadata and formula explanation
    """
    try:
        # Verify business profile exists and user owns it
        business_profile = db.query(BusinessProfile).filter(
            BusinessProfile.id == request.entity_id
        ).first()
        
        if not business_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Business profile not found: {request.entity_id}"
            )
        
        if business_profile.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to compute scores for this business"
            )
        
        logger.info(
            f"User {current_user.email} computing GEO score for business {business_profile.name} "
            f"(id={business_profile.id})"
        )
        
        # Initialize scoring service
        scoring_service = GeoScoringService(db)
        
        # Compute score
        geo_score = scoring_service.compute_geo_score(
            business_profile_id=business_profile.id,
            user_id=current_user.id
        )
        
        # Get score explanation
        explanation = scoring_service.get_score_explanation(geo_score)
        
        # Build response
        response = GeoScoreResponse(
            score_id=geo_score.id,
            business_profile_id=geo_score.business_profile_id,
            business_name=business_profile.name,
            presence_score=float(geo_score.presence_score),
            accuracy_score=float(geo_score.accuracy_score),
            trust_score=float(geo_score.trust_score),
            hallucination_penalty=float(geo_score.hallucination_penalty),
            final_geo_score=float(geo_score.final_geo_score),
            presence_breakdown=geo_score.presence_breakdown,
            accuracy_breakdown=geo_score.accuracy_breakdown,
            trust_breakdown=geo_score.trust_breakdown,
            hallucination_breakdown=geo_score.hallucination_breakdown,
            prompt_results_count=geo_score.prompt_results_count,
            computation_method=geo_score.computation_method,
            computed_at=geo_score.computed_at.isoformat() if geo_score.computed_at else None,
            formula=explanation["formula"],
            calculation=explanation["calculation"],
            total_calculation_string=explanation["total_calculation"]
        )
        
        logger.info(
            f"GEO score computed successfully for business {business_profile.name}: "
            f"Final Score = {geo_score.final_geo_score}"
        )
        
        return response
    
    except ValueError as e:
        logger.error(f"Scoring error for business {request.entity_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error computing score: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compute GEO score: {str(e)}"
        )


@router.get("/{entity_id}", response_model=GeoScoreResponse, status_code=status.HTTP_200_OK)
async def get_geo_score(
    entity_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve the latest GEO score for a business entity.
    
    This endpoint returns the most recently computed score with full breakdowns.
    If no score exists, run POST /compute first.
    
    **Returns:**
    - Latest GEO score with all components
    - Full breakdown for each dimension
    - Formula explanation and calculation details
    
    **Errors:**
    - 404: Business profile not found or no score computed yet
    - 403: User does not own the business profile
    """
    try:
        # Verify business profile exists and user owns it
        business_profile = db.query(BusinessProfile).filter(
            BusinessProfile.id == entity_id
        ).first()
        
        if not business_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Business profile not found: {entity_id}"
            )
        
        if business_profile.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view scores for this business"
            )
        
        # Initialize scoring service
        scoring_service = GeoScoringService(db)
        
        # Get latest score
        geo_score = scoring_service.get_geo_score(business_profile_id=entity_id)
        
        if not geo_score:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    f"No GEO score found for business {business_profile.name}. "
                    "Please run POST /api/geo/score/compute first."
                )
            )
        
        # Get score explanation
        explanation = scoring_service.get_score_explanation(geo_score)
        
        # Build response
        response = GeoScoreResponse(
            score_id=geo_score.id,
            business_profile_id=geo_score.business_profile_id,
            business_name=business_profile.name,
            presence_score=float(geo_score.presence_score),
            accuracy_score=float(geo_score.accuracy_score),
            trust_score=float(geo_score.trust_score),
            hallucination_penalty=float(geo_score.hallucination_penalty),
            final_geo_score=float(geo_score.final_geo_score),
            presence_breakdown=geo_score.presence_breakdown,
            accuracy_breakdown=geo_score.accuracy_breakdown,
            trust_breakdown=geo_score.trust_breakdown,
            hallucination_breakdown=geo_score.hallucination_breakdown,
            prompt_results_count=geo_score.prompt_results_count,
            computation_method=geo_score.computation_method,
            computed_at=geo_score.computed_at.isoformat() if geo_score.computed_at else None,
            formula=explanation["formula"],
            calculation=explanation["calculation"],
            total_calculation_string=explanation["total_calculation"]
        )
        
        logger.info(
            f"Retrieved GEO score for business {business_profile.name}: "
            f"Final Score = {geo_score.final_geo_score}"
        )
        
        return response
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error retrieving score: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve GEO score: {str(e)}"
        )


@router.get("/breakdown/{entity_id}", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
async def get_score_breakdown(
    entity_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed breakdown of each score component for a business.
    
    This endpoint provides granular details about how each dimension was calculated,
    including all sub-components, formulas, and raw data used.
    
    **Use Case:**
    - Dashboard widgets showing individual score components
    - Detailed analytics for score optimization
    - Transparency and explainability for users
    
    **Returns:**
    - Presence breakdown: mentions, directories, citations
    - Accuracy breakdown: NAP consistency, category alignment
    - Trust breakdown: sentiment, volume, signals
    - Hallucination breakdown: penalties and reasons
    """
    try:
        # Verify business profile exists and user owns it
        business_profile = db.query(BusinessProfile).filter(
            BusinessProfile.id == entity_id
        ).first()
        
        if not business_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Business profile not found: {entity_id}"
            )
        
        if business_profile.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view scores for this business"
            )
        
        # Get latest score
        scoring_service = GeoScoringService(db)
        geo_score = scoring_service.get_geo_score(business_profile_id=entity_id)
        
        if not geo_score:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No GEO score found for business {business_profile.name}"
            )
        
        # Return detailed breakdowns
        return {
            "business_profile_id": geo_score.business_profile_id,
            "business_name": business_profile.name,
            "final_geo_score": float(geo_score.final_geo_score),
            "computed_at": geo_score.computed_at.isoformat() if geo_score.computed_at else None,
            "breakdowns": {
                "presence": geo_score.presence_breakdown,
                "accuracy": geo_score.accuracy_breakdown,
                "trust": geo_score.trust_breakdown,
                "hallucination": geo_score.hallucination_breakdown
            },
            "metadata": {
                "prompt_results_count": geo_score.prompt_results_count,
                "computation_method": geo_score.computation_method
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error retrieving breakdown: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve score breakdown: {str(e)}"
        )
