from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import Optional
import uuid
import logging

from app.database import get_db
from app.models import Locker, LockerStatus, Member
from app.security import get_current_user, TokenData

logger = logging.getLogger(__name__)
router = APIRouter()


def _serialize(l: Locker) -> dict:
    member_name = None
    if l.member:
        member_name = f"{l.member.first_name} {l.member.last_name or ''}".strip()
    return {
        "id": str(l.id),
        "locker_number": l.locker_number,
        "location": l.location,
        "status": l.status.value if hasattr(l.status, "value") else l.status,
        "member_id": str(l.member_id) if l.member_id else None,
        "member_name": member_name,
        "assigned_date": l.assigned_date,
        "expiry_date": l.expiry_date,
        "monthly_fee": l.monthly_fee,
        "notes": l.notes,
        "created_at": l.created_at,
    }


@router.get("/")
async def list_lockers(
    locker_status: Optional[str] = Query(None, alias="status"),
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Locker).filter(Locker.vendor_id == current_user.vendor_id)
    if locker_status:
        query = query.filter(Locker.status == locker_status)

    items = query.order_by(Locker.locker_number).all()

    # Auto-expire overdue assignments
    now = datetime.utcnow()
    changed = False
    for l in items:
        if l.expiry_date and l.expiry_date < now and l.status == LockerStatus.OCCUPIED:
            l.status = LockerStatus.AVAILABLE
            l.member_id = None
            l.assigned_date = None
            l.expiry_date = None
            changed = True
    if changed:
        db.commit()
        items = db.query(Locker).filter(Locker.vendor_id == current_user.vendor_id).order_by(Locker.locker_number).all()

    total = len(items)
    available = sum(1 for l in items if (l.status.value if hasattr(l.status, "value") else l.status) == "available")
    occupied = sum(1 for l in items if (l.status.value if hasattr(l.status, "value") else l.status) == "occupied")

    return {
        "total": total,
        "available": available,
        "occupied": occupied,
        "items": [_serialize(l) for l in items],
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_locker(
    data: dict,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not data.get("locker_number"):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "locker_number is required")

    existing = db.query(Locker).filter(
        Locker.vendor_id == current_user.vendor_id,
        Locker.locker_number == data["locker_number"],
    ).first()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Locker number already exists")

    locker = Locker(
        id=uuid.uuid4(),
        vendor_id=current_user.vendor_id,
        locker_number=data["locker_number"].strip(),
        location=data.get("location"),
        monthly_fee=float(data.get("monthly_fee", 0)),
        notes=data.get("notes"),
        status=LockerStatus.AVAILABLE,
    )
    db.add(locker)
    db.commit()
    db.refresh(locker)
    return _serialize(locker)


@router.post("/{locker_id}/assign")
async def assign_locker(
    locker_id: str,
    data: dict,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    locker = db.query(Locker).filter(
        Locker.id == locker_id,
        Locker.vendor_id == current_user.vendor_id,
    ).first()
    if not locker:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Locker not found")

    if (locker.status.value if hasattr(locker.status, "value") else locker.status) == "occupied":
        raise HTTPException(status.HTTP_409_CONFLICT, "Locker is already occupied")

    member_id = data.get("member_id")
    if not member_id:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "member_id is required")

    member = db.query(Member).filter(
        Member.id == member_id,
        Member.vendor_id == current_user.vendor_id,
    ).first()
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")

    locker.member_id = member_id
    locker.status = LockerStatus.OCCUPIED
    locker.assigned_date = datetime.utcnow()
    locker.expiry_date = data.get("expiry_date")
    locker.monthly_fee = float(data.get("monthly_fee", locker.monthly_fee or 0))

    db.commit()
    db.refresh(locker)
    return _serialize(locker)


@router.post("/{locker_id}/release")
async def release_locker(
    locker_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    locker = db.query(Locker).filter(
        Locker.id == locker_id,
        Locker.vendor_id == current_user.vendor_id,
    ).first()
    if not locker:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Locker not found")

    locker.status = LockerStatus.AVAILABLE
    locker.member_id = None
    locker.assigned_date = None
    locker.expiry_date = None
    db.commit()
    db.refresh(locker)
    return _serialize(locker)


@router.put("/{locker_id}")
async def update_locker(
    locker_id: str,
    data: dict,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    locker = db.query(Locker).filter(
        Locker.id == locker_id,
        Locker.vendor_id == current_user.vendor_id,
    ).first()
    if not locker:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Locker not found")

    for field in ("location", "monthly_fee", "notes", "status"):
        if field in data:
            setattr(locker, field, data[field])

    db.commit()
    db.refresh(locker)
    return _serialize(locker)


@router.delete("/{locker_id}")
async def delete_locker(
    locker_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    locker = db.query(Locker).filter(
        Locker.id == locker_id,
        Locker.vendor_id == current_user.vendor_id,
    ).first()
    if not locker:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Locker not found")

    db.delete(locker)
    db.commit()
    return {"message": "Locker deleted", "id": locker_id}
