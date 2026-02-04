"""
GEO Prompts API Routes
======================

Endpoints for executing GEO analysis prompts and retrieving results.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from loguru import logger
import os

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.business_profile import BusinessProfile
from app.models.geo_prompt import GeoPrompt, GeoPromptResult, ExecutionStatus
from app.services.geo_prompt_executor import GeoPromptExecutorService


router = APIRouter(prefix="/api/geo/prompts", tags=["GEO Prompts"])


# ============================================================================
# REQUEST/RESPONSE SCHEMAS
# ============================================================================

class RunPromptsRequest(BaseModel):
    """Request to execute GEO prompts."""
    entity_id: str = Field(..., description="Business profile ID")
    category_filter: Optional[str] = Field(None, description="Optional category filter (e.g., 'entity_definition')")


class PromptExecutionResult(BaseModel):
    """Individual prompt execution result summary."""
    prompt_id: str
    status: str
    duration_ms: int


class ExecutionSummary(BaseModel):
    """Summary of prompt execution batch."""
    total: int = Field(..., description="Total prompts executed")
    succeeded: int = Field(..., description="Successfully completed prompts")
    failed: int = Field(..., description="Failed prompts")
    duration_ms: int = Field(..., description="Total execution time in milliseconds")
    results: List[PromptExecutionResult]


class CitationItem(BaseModel):
    """Source citation."""
    type: str = Field(..., description="Citation type: 'website', 'review', 'mention'")
    url: Optional[str] = Field(None, description="Source URL for website/mention citations")
    id: Optional[str] = Field(None, description="ID for review/mention citations")
    path: Optional[str] = Field(None, description="JSON path where citation appears")


class PromptResultDetail(BaseModel):
    """Detailed prompt result."""
    result_id: str
    prompt_id: str
    prompt_title: str
    prompt_category: str
    execution_status: str
    execution_timestamp: str
    execution_duration_ms: int
    raw_response: Optional[str]
    structured_response: Optional[Dict[str, Any]]
    confidence_score: Optional[float]
    cited_sources: Optional[List[Dict[str, Any]]]
    validation_passed: Optional[str]
    validation_errors: Optional[Dict[str, Any]]
    error_message: Optional[str]
    retry_count: int


class PromptResultsResponse(BaseModel):
    """Response containing prompt results grouped by category."""
    business_id: str
    business_name: str
    total_results: int
    categories: Dict[str, List[PromptResultDetail]]


class PromptLibraryItem(BaseModel):
    """Prompt library item (for debugging/docs)."""
    prompt_id: str
    category: str
    title: str
    description: Optional[str]
    temperature: float
    scoring_weight: float
    execution_order: int
    is_active: str


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/run", response_model=ExecutionSummary, status_code=status.HTTP_200_OK)
async def run_geo_prompts(
    request: RunPromptsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Execute all GEO analysis prompts for a business entity.
    
    **Authentication Required**
    
    **Request Body:**
    ```json
    {
        "entity_id": "7b073ec0-8277-4d64-a8c7-9f1e866ef3d1",
        "category_filter": null
    }
    ```
    
    **Success Response (200):**
    ```json
    {
        "total": 22,
        "succeeded": 21,
        "failed": 1,
        "duration_ms": 45230,
        "results": [
            {
                "prompt_id": "entity_def_001",
                "status": "completed",
                "duration_ms": 2150
            }
        ]
    }
    ```
    
    **Error Responses:**
    - 401: Unauthorized (missing or invalid token)
    - 404: Business profile not found
    - 500: Execution error
    """
    try:
        # Verify business profile exists and belongs to user
        business = db.query(BusinessProfile).filter(
            BusinessProfile.id == request.entity_id,
            BusinessProfile.user_id == current_user.id
        ).first()
        
        if not business:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Business profile {request.entity_id} not found or access denied"
            )
        
        # Get OpenAI API key from environment
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="OPENAI_API_KEY not configured"
            )
        
        # Initialize executor
        executor = GeoPromptExecutorService(db=db, openai_api_key=openai_api_key)
        
        # Execute prompts
        logger.info(f"User {current_user.email} executing GEO prompts for business {business.name}")
        
        summary = executor.execute_all_prompts(
            business_profile_id=request.entity_id,
            user_id=str(current_user.id),
            category_filter=request.category_filter
        )
        
        return ExecutionSummary(**summary)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing GEO prompts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Execution error: {str(e)}"
        )


@router.get("/results/{entity_id}", response_model=PromptResultsResponse, status_code=status.HTTP_200_OK)
async def get_prompt_results(
    entity_id: str,
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get GEO prompt execution results for a business entity.
    
    **Authentication Required**
    
    **Query Parameters:**
    - `category` (optional): Filter by category (e.g., 'entity_definition', 'trust_reviews')
    
    **Success Response (200):**
    ```json
    {
        "business_id": "7b073ec0-8277-4d64-a8c7-9f1e866ef3d1",
        "business_name": "Example Business",
        "total_results": 22,
        "categories": {
            "entity_definition": [
                {
                    "result_id": "abc123",
                    "prompt_id": "entity_def_001",
                    "prompt_title": "Core Business Identity",
                    "prompt_category": "entity_definition",
                    "execution_status": "completed",
                    "execution_timestamp": "2026-01-27T10:30:00",
                    "execution_duration_ms": 2150,
                    "structured_response": {
                        "identity": {
                            "text": "A digital marketing agency...",
                            "source_url": "https://example.com/about"
                        }
                    },
                    "confidence_score": 0.95,
                    "cited_sources": [
                        {"type": "website", "url": "https://example.com/about"}
                    ],
                    "validation_passed": "true",
                    "retry_count": 0
                }
            ]
        }
    }
    ```
    
    **Error Responses:**
    - 401: Unauthorized
    - 404: Business profile not found
    - 500: Database error
    """
    try:
        # Verify business profile exists and belongs to user
        business = db.query(BusinessProfile).filter(
            BusinessProfile.id == entity_id,
            BusinessProfile.user_id == current_user.id
        ).first()
        
        if not business:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Business profile {entity_id} not found or access denied"
            )
        
        # Query results
        query = db.query(GeoPromptResult).join(GeoPrompt).filter(
            GeoPromptResult.business_profile_id == entity_id
        )
        
        if category:
            query = query.filter(GeoPrompt.category == category)
        
        results = query.order_by(
            GeoPrompt.category,
            GeoPrompt.execution_order
        ).all()
        
        # Group by category
        categories_dict = {}
        for result in results:
            cat = result.prompt.category.value
            if cat not in categories_dict:
                categories_dict[cat] = []
            
            categories_dict[cat].append(PromptResultDetail(
                result_id=str(result.id),
                prompt_id=result.prompt.prompt_id,
                prompt_title=result.prompt.title,
                prompt_category=cat,
                execution_status=result.execution_status.value,
                execution_timestamp=result.execution_timestamp.isoformat() if result.execution_timestamp else None,
                execution_duration_ms=result.execution_duration_ms or 0,
                raw_response=result.raw_response,
                structured_response=result.structured_response,
                confidence_score=float(result.confidence_score) if result.confidence_score else None,
                cited_sources=result.cited_sources,
                validation_passed=result.validation_passed,
                validation_errors=result.validation_errors,
                error_message=result.error_message,
                retry_count=result.retry_count or 0
            ))
        
        return PromptResultsResponse(
            business_id=str(business.id),
            business_name=business.business_name,
            total_results=len(results),
            categories=categories_dict
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching prompt results: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@router.get("/library", response_model=List[PromptLibraryItem], status_code=status.HTTP_200_OK)
async def get_prompt_library(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the GEO prompt library (all available prompts).
    
    **Authentication Required**
    
    **Success Response (200):**
    ```json
    [
        {
            "prompt_id": "entity_def_001",
            "category": "entity_definition",
            "title": "Core Business Identity",
            "description": "Extract the fundamental identity...",
            "temperature": 0.2,
            "scoring_weight": 1.0,
            "execution_order": 1,
            "is_active": "true"
        }
    ]
    ```
    """
    try:
        prompts = db.query(GeoPrompt).filter(
            GeoPrompt.is_active == "true"
        ).order_by(
            GeoPrompt.category,
            GeoPrompt.execution_order
        ).all()
        
        return [
            PromptLibraryItem(
                prompt_id=p.prompt_id,
                category=p.category.value,
                title=p.title,
                description=p.description,
                temperature=float(p.temperature),
                scoring_weight=float(p.scoring_weight),
                execution_order=p.execution_order,
                is_active=p.is_active
            )
            for p in prompts
        ]
        
    except Exception as e:
        logger.error(f"Error fetching prompt library: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
