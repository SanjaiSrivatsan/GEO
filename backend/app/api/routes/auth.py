"""
Authentication Routes
Endpoints for user registration, login, and user info
"""

from typing import Annotated
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.services.auth_service import AuthService
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    AuthResponse,
    TokenResponse,
    UserResponse
)
from app.models.user import User
from app.config import settings


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new user",
    description="Create a new user account with email and password. Returns user info and JWT token."
)
async def register(
    request: RegisterRequest,
    db: Annotated[Session, Depends(get_db)]
):
    """
    Register a new user account
    
    - **email**: Valid email address (must be unique)
    - **password**: Password with minimum 8 characters
    
    Returns user information and JWT access token for immediate login.
    """
    # Check if user already exists
    existing_user = AuthService.get_user_by_email(db, request.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    try:
        user = AuthService.create_user(db, request.email, request.password)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Generate access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = AuthService.create_access_token(
        data={"sub": user.id},
        expires_delta=access_token_expires
    )
    
    # Prepare response
    user_response = UserResponse.model_validate(user)
    token_response = TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60  # Convert to seconds
    )
    
    return AuthResponse(user=user_response, token=token_response)


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="User login",
    description="Authenticate user with email and password. Returns JWT token on success."
)
async def login(
    request: LoginRequest,
    db: Annotated[Session, Depends(get_db)]
):
    """
    Login with email and password
    
    - **email**: User's email address
    - **password**: User's password
    
    Returns user information and JWT access token.
    """
    # Authenticate user
    user = AuthService.authenticate_user(db, request.email, request.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = AuthService.create_access_token(
        data={"sub": user.id},
        expires_delta=access_token_expires
    )
    
    # Prepare response
    user_response = UserResponse.model_validate(user)
    token_response = TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60  # Convert to seconds
    )
    
    return AuthResponse(user=user_response, token=token_response)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user",
    description="Get information about the currently authenticated user. Requires valid JWT token."
)
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)]
):
    """
    Get current user information
    
    Requires authentication via Bearer token in Authorization header.
    
    Returns the authenticated user's information.
    """
    return UserResponse.model_validate(current_user)
