from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import logging

from app.config import settings  # ✅ FIXED: Moved to top - was at line 316, causing NameError
from app.database import get_db
from app.models import User, Vendor
from app.schemas import LoginRequest, TokenResponse, RefreshTokenRequest
from app.security import (
    AccessToken, RefreshToken, PasswordManager, TokenData, get_current_user
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticate user and return access and refresh tokens
    
    Args:
        request: Login credentials (email, password)
        db: Database session
    
    Returns:
        TokenResponse with access_token and refresh_token
    """
    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user:
        logger.warning(f"Login attempt with non-existent email: {request.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Verify password
    if not PasswordManager.verify_password(request.password, user.password_hash):
        logger.warning(f"Failed login attempt for user: {user.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Get vendor info
    vendor = db.query(Vendor).filter(Vendor.id == user.vendor_id).first()
    vendor_id = str(user.vendor_id) if user.vendor_id else None
    
    # Generate tokens
    access_token = AccessToken.create_access_token(
        user_id=str(user.id),
        vendor_id=vendor_id,
        email=user.email,
        role=user.role.value
    )
    
    refresh_token = RefreshToken.create_refresh_token(
        user_id=str(user.id),
        vendor_id=vendor_id,
        email=user.email
    )
    
    logger.info(f"User logged in successfully: {user.email}")
    
    # ✅ FIXED: settings now available here (moved to top)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=60 * settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """
    Refresh access token using refresh token
    
    Args:
        request: RefreshTokenRequest with refresh_token
        db: Database session
    
    Returns:
        TokenResponse with new access_token
    """
    # Verify refresh token
    payload = RefreshToken.verify_refresh_token(request.refresh_token)
    
    user_id = payload.get("user_id")
    vendor_id = payload.get("vendor_id")
    email = payload.get("email")
    
    # Get user from database to verify still active
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists or is inactive"
        )
    
    # Create new access token
    access_token = AccessToken.create_access_token(
        user_id=user_id,
        vendor_id=vendor_id,
        email=email,
        role=user.role.value
    )
    
    # Create new refresh token
    new_refresh_token = RefreshToken.create_refresh_token(
        user_id=user_id,
        vendor_id=vendor_id,
        email=email
    )
    
    logger.info(f"Token refreshed for user: {email}")
    
    # ✅ FIXED: settings now available here (moved to top)
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        expires_in=60 * settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )


@router.get("/me")
async def get_current_user_info(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current authenticated user information
    
    Args:
        current_user: Current user from token
        db: Database session
    
    Returns:
        User information
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {
        "id": str(user.id),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role.value,
        "vendor_id": str(user.vendor_id) if user.vendor_id else None,
        "is_active": user.is_active,
        "created_at": user.created_at
    }


@router.post("/logout")
async def logout(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Logout user (update last login timestamp)
    
    Args:
        current_user: Current user from token
        db: Database session
    
    Returns:
        Success message
    """
    user = db.query(User).filter(User.id == current_user.user_id).first()
    
    if user:
        # In a real application, you might maintain a token blacklist or revocation list
        logger.info(f"User logged out: {user.email}")
    
    return {"message": "Successfully logged out"}


@router.post("/change-password")
async def change_password(
    old_password: str,
    new_password: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change user password
    
    Args:
        old_password: Current password
        new_password: New password
        current_user: Current user from token
        db: Database session
    
    Returns:
        Success message
    """
    if len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="New password must be at least 8 characters long"
        )
    
    user = db.query(User).filter(User.id == current_user.user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify old password
    if not PasswordManager.verify_password(old_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Old password is incorrect"
        )
    
    # Hash and update new password
    user.password_hash = PasswordManager.hash_password(new_password)
    db.commit()
    
    logger.info(f"Password changed for user: {user.email}")
    
    return {"message": "Password changed successfully"}


@router.post("/forgot-password")
async def forgot_password(
    email: str,
    db: Session = Depends(get_db)
):
    """
    Request password reset
    
    Args:
        email: User email
        db: Database session
    
    Returns:
        Success message
    """
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        # For security, don't reveal if email exists
        return {"message": "If email exists, password reset link has been sent"}
    
    # TODO: Generate reset token and send email
    # from app.services.email import send_password_reset_email
    # reset_token = generate_reset_token(user.id)
    # send_password_reset_email(user.email, reset_token)
    
    logger.info(f"Password reset requested for: {email}")
    
    return {"message": "If email exists, password reset link has been sent"}


@router.post("/reset-password")
async def reset_password(
    token: str,
    new_password: str,
    db: Session = Depends(get_db)
):
    """
    Reset password using reset token
    
    Args:
        token: Password reset token
        new_password: New password
        db: Database session
    
    Returns:
        Success message
    """
    if len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters long"
        )
    
    # TODO: Verify reset token
    # user_id = verify_reset_token(token)
    # if not user_id:
    #     raise HTTPException(status_code=400, detail="Invalid or expired token")
    
    # user = db.query(User).filter(User.id == user_id).first()
    # user.password_hash = PasswordManager.hash_password(new_password)
    # db.commit()
    
    logger.info("Password reset successful")
    
    return {"message": "Password reset successfully"}
