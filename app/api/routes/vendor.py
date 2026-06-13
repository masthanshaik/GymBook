from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
import logging
import uuid

from app.database import get_db
from app.models import Vendor, VendorSettings, User
from app.schemas import VendorCreate, VendorUpdate, VendorResponse
from app.security import get_current_user, TokenData, PasswordManager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/signup", response_model=VendorResponse)
async def vendor_signup(
    request: VendorCreate,
    db: Session = Depends(get_db)
):
    """
    Register a new gym vendor with complete validation and error handling
    
    Args:
        request: Vendor registration details
        db: Database session
    
    Returns:
        Created vendor details
        
    Raises:
        HTTPException: For validation errors or duplicate records
    """
    try:
        # ✅ FIXED 1: Validate subdomain format
        if not request.subdomain:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Subdomain cannot be empty"
            )
        
        if len(request.subdomain) < 3:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Subdomain must be at least 3 characters long"
            )
        
        if len(request.subdomain) > 100:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Subdomain cannot exceed 100 characters"
            )
        
        # ✅ FIXED 2: Validate password length early
        if not request.owner_password or len(request.owner_password) < 8:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Password must be at least 8 characters long"
            )
        
        # ✅ FIXED 3: Check if subdomain already exists
        existing_vendor = db.query(Vendor).filter(
            Vendor.subdomain == request.subdomain.lower()
        ).first()
        if existing_vendor:
            logger.warning(f"Subdomain already taken: {request.subdomain}")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Subdomain already taken"
            )
        
        # ✅ FIXED 4: Check if gym email already exists
        existing_email = db.query(Vendor).filter(
            Vendor.email == request.email
        ).first()
        if existing_email:
            logger.warning(f"Gym email already registered: {request.email}")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered for a gym"
            )
        
        # ✅ FIXED 5: Check if owner email already exists in users table
        existing_owner = db.query(User).filter(
            User.email == request.owner_email
        ).first()
        if existing_owner:
            logger.warning(f"Owner email already registered: {request.owner_email}")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Owner email already registered as a user"
            )
        
        # ✅ FIXED 6: Validate owner name and parse safely
        owner_name = request.owner_name.strip() if request.owner_name else ""
        if not owner_name:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Owner name cannot be empty"
            )
        
        # Safe name parsing to avoid IndexError
        name_parts = owner_name.split()
        first_name = name_parts[0] if len(name_parts) > 0 else ""
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
        
        # Normalize/trim data
        vendor_name = request.vendor_name.strip()
        subdomain_lower = request.subdomain.lower().strip()
        email_lower = request.email.lower().strip()
        owner_email_lower = request.owner_email.lower().strip()
        
        # ✅ FIXED 7: Wrap in try/except with rollback for transaction safety
        try:
            # Create vendor with explicit UUID
            vendor = Vendor(
                id=uuid.uuid4(),
                vendor_name=vendor_name,
                subdomain=subdomain_lower,
                email=email_lower,
                phone=request.phone,
                address=request.address,
                city=request.city,
                state=request.state,
                postal_code=request.postal_code,
                owner_name=owner_name,
                owner_email=owner_email_lower,
                estimated_members=request.estimated_members or 0
            )
            
            db.add(vendor)
            db.flush()  # Get vendor ID without committing
            
            logger.info(f"Vendor created: {vendor.id} - {vendor.vendor_name}")
            
            # Create vendor settings
            vendor_settings = VendorSettings(
                id=uuid.uuid4(),
                vendor_id=vendor.id
            )
            db.add(vendor_settings)
            db.flush()
            
            logger.info(f"Vendor settings created: {vendor_settings.id}")
            
            # Create owner user account with explicit UUID
            # ✅ FIXED 8: Password validation happens before hashing
            try:
                password_hash = PasswordManager.hash_password(request.owner_password)
            except ValueError as ve:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=str(ve)
                )
            
            owner_user = User(
                id=uuid.uuid4(),
                vendor_id=vendor.id,
                email=owner_email_lower,
                password_hash=password_hash,
                first_name=first_name,
                last_name=last_name,
                role="gym_owner",  # Using string instead of enum
                is_active=True
            )
            
            db.add(owner_user)
            db.flush()
            
            logger.info(f"Owner user created: {owner_user.id} - {owner_user.email}")
            
            # Commit all changes
            db.commit()
            
            logger.info(
                f"New vendor registered successfully: {vendor.vendor_name} "
                f"(subdomain: {vendor.subdomain}, owner: {owner_user.email})"
            )
            
            return VendorResponse.from_orm(vendor)
        
        except HTTPException:
            # Re-raise HTTP exceptions without rollback message
            db.rollback()
            raise
        except Exception as e:
            # ✅ FIXED 9: Rollback on any database error
            db.rollback()
            logger.error(
                f"Error during vendor signup: {str(e)}, "
                f"subdomain: {subdomain_lower}, "
                f"owner_email: {owner_email_lower}"
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error creating vendor account. Please try again."
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in vendor_signup: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during signup"
        )


@router.get("/{vendor_id}", response_model=VendorResponse)
async def get_vendor(
    vendor_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get vendor details
    
    Args:
        vendor_id: Vendor ID
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Vendor details
    """
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
    
    # Check authorization
    if current_user.vendor_id != vendor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return VendorResponse.from_orm(vendor)


@router.put("/{vendor_id}", response_model=VendorResponse)
async def update_vendor(
    vendor_id: str,
    request: VendorUpdate,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update vendor details
    
    Args:
        vendor_id: Vendor ID
        request: Updated vendor details
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Updated vendor details
    """
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
    
    # Check authorization
    if current_user.vendor_id != vendor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Update fields
    update_data = request.dict(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(vendor, field, value)
    
    db.commit()
    db.refresh(vendor)
    
    logger.info(f"Vendor updated: {vendor.vendor_name}")
    
    return VendorResponse.from_orm(vendor)


@router.get("/{vendor_id}/settings")
async def get_vendor_settings(
    vendor_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get vendor settings
    
    Args:
        vendor_id: Vendor ID
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Vendor settings
    """
    if current_user.vendor_id != vendor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    settings = db.query(VendorSettings).filter(VendorSettings.vendor_id == vendor_id).first()
    
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Settings not found"
        )
    
    return {
        "id": str(settings.id),
        "opening_time": settings.opening_time,
        "closing_time": settings.closing_time,
        "whatsapp_enabled": settings.whatsapp_enabled,
        "email_enabled": settings.email_enabled,
        "sms_enabled": settings.sms_enabled,
        "renewal_reminder_days": settings.renewal_reminder_days,
        "enable_online_payment": settings.enable_online_payment,
        "enable_membership_plans": settings.enable_membership_plans,
        "enable_class_booking": settings.enable_class_booking,
        "enable_attendance_tracking": settings.enable_attendance_tracking,
        "enable_api_access": settings.enable_api_access,
    }


@router.put("/{vendor_id}/settings")
async def update_vendor_settings(
    vendor_id: str,
    settings_data: dict,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update vendor settings
    
    Args:
        vendor_id: Vendor ID
        settings_data: Settings to update
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Updated settings
    """
    if current_user.vendor_id != vendor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    settings = db.query(VendorSettings).filter(VendorSettings.vendor_id == vendor_id).first()
    
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Settings not found"
        )
    
    # Update settings
    for field, value in settings_data.items():
        if hasattr(settings, field):
            setattr(settings, field, value)
    
    db.commit()
    db.refresh(settings)
    
    logger.info(f"Vendor settings updated for: {vendor_id}")
    
    return {
        "message": "Settings updated successfully",
        "settings": {
            "opening_time": settings.opening_time,
            "closing_time": settings.closing_time,
            "email_enabled": settings.email_enabled,
        }
    }


@router.post("/{vendor_id}/staff")
async def add_staff_member(
    vendor_id: str,
    staff_data: dict,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add staff member to gym
    
    Args:
        vendor_id: Vendor ID
        staff_data: Staff member details
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Created staff member
    """
    if current_user.vendor_id != vendor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Validate staff data
    if not staff_data.get("email"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Email is required"
        )
    
    if not staff_data.get("password"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password is required"
        )
    
    # Check if email already exists globally
    existing_user = db.query(User).filter(
        User.email == staff_data.get("email").lower()
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already in use"
        )
    
    try:
        # Hash password
        password_hash = PasswordManager.hash_password(staff_data.get("password"))
        
        # Create user
        new_staff = User(
            id=uuid.uuid4(),
            vendor_id=vendor_id,
            email=staff_data.get("email").lower(),
            password_hash=password_hash,
            first_name=staff_data.get("first_name", ""),
            last_name=staff_data.get("last_name", ""),
            role=staff_data.get("role", "gym_manager"),
            phone=staff_data.get("phone"),
            is_active=True
        )
        
        db.add(new_staff)
        db.commit()
        
        logger.info(f"Staff member added to vendor {vendor_id}: {new_staff.email}")
        
        return {
            "id": str(new_staff.id),
            "email": new_staff.email,
            "first_name": new_staff.first_name,
            "last_name": new_staff.last_name,
            "role": new_staff.role if isinstance(new_staff.role, str) else new_staff.role.value,
            "created_at": new_staff.created_at
        }
    
    except ValueError as ve:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve)
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding staff member: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error adding staff member"
        )


@router.get("/{vendor_id}/staff")
async def list_staff_members(
    vendor_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all staff members for vendor
    
    Args:
        vendor_id: Vendor ID
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        List of staff members
    """
    if current_user.vendor_id != vendor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    staff_members = db.query(User).filter(
        User.vendor_id == vendor_id,
        User.deleted_at == None
    ).all()
    
    return [
        {
            "id": str(staff.id),
            "email": staff.email,
            "first_name": staff.first_name,
            "last_name": staff.last_name,
            "role": staff.role if isinstance(staff.role, str) else staff.role.value,
            "phone": staff.phone,
            "is_active": staff.is_active,
            "last_login": staff.last_login,
            "created_at": staff.created_at
        }
        for staff in staff_members
    ]
