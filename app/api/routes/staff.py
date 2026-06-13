from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
import uuid
import logging

from app.database import get_db
from app.models import User, UserRole
from app.security import get_current_user, TokenData, PasswordManager

logger = logging.getLogger(__name__)
router = APIRouter()


def _serialize(u: User) -> dict:
    return {
        "id": str(u.id),
        "email": u.email,
        "phone": u.phone,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "role": u.role.value if hasattr(u.role, "value") else u.role,
        "is_active": u.is_active,
        "last_login": u.last_login,
        "created_at": u.created_at,
    }


@router.get("/")
async def list_staff(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    staff = db.query(User).filter(
        User.vendor_id == current_user.vendor_id,
        User.deleted_at.is_(None),
    ).order_by(User.created_at.desc()).all()
    return [_serialize(u) for u in staff]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_staff(
    data: dict,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "email is required")
    if len(password) < 8:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "password must be at least 8 characters")

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already in use")

    valid_roles = {r.value for r in UserRole}
    role = data.get("role", "front_desk")
    if role not in valid_roles:
        role = "front_desk"

    user = User(
        id=uuid.uuid4(),
        vendor_id=current_user.vendor_id,
        email=email,
        password_hash=PasswordManager.hash_password(password),
        first_name=(data.get("first_name") or "").strip(),
        last_name=(data.get("last_name") or "").strip() or None,
        phone=data.get("phone"),
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info(f"Staff created: {user.email} for vendor {current_user.vendor_id}")
    return _serialize(user)


@router.put("/{staff_id}")
async def update_staff(
    staff_id: str,
    data: dict,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(
        User.id == staff_id,
        User.vendor_id == current_user.vendor_id,
        User.deleted_at.is_(None),
    ).first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Staff member not found")

    for field in ("first_name", "last_name", "phone", "role", "is_active"):
        if field in data:
            setattr(user, field, data[field])

    if "password" in data and data["password"]:
        if len(data["password"]) < 8:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Password must be at least 8 characters")
        user.password_hash = PasswordManager.hash_password(data["password"])

    db.commit()
    db.refresh(user)
    return _serialize(user)


@router.delete("/{staff_id}")
async def delete_staff(
    staff_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(
        User.id == staff_id,
        User.vendor_id == current_user.vendor_id,
        User.deleted_at.is_(None),
    ).first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Staff member not found")

    if str(user.id) == current_user.user_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot delete your own account")

    user.deleted_at = datetime.utcnow()
    user.is_active = False
    db.commit()
    return {"message": "Staff member removed", "id": staff_id}
