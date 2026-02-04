from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime
from app.config import settings

router = APIRouter(prefix="/health", tags=["Health"])


class HealthResponse(BaseModel):
    """Health check response model"""
    status: str
    app_name: str
    version: str
    environment: str
    timestamp: datetime


@router.get("", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.
    Returns application status and metadata.
    
    Returns:
        HealthResponse: Application health status
    """
    return HealthResponse(
        status="healthy",
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        timestamp=datetime.utcnow()
    )


@router.get("/ping")
async def ping():
    """
    Simple ping endpoint for quick availability checks.
    
    Returns:
        dict: Simple pong response
    """
    return {"ping": "pong"}
