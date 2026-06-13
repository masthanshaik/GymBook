from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import Optional
from datetime import datetime
import uuid
import logging

from app.database import get_db
from app.models import Member, Vendor, MembershipStatus
from app.schemas import MemberCreate, MemberUpdate
from app.security import get_current_user, TokenData

logger = logging.getLogger(__name__)
router = APIRouter()


def _serialize(m: Member) -> dict:
    meta = m.extra_metadata or {}
    return {
        "id": str(m.id),
        "vendor_id": str(m.vendor_id),
        "email": m.email,
        "phone": m.phone,
        "first_name": m.first_name,
        "last_name": m.last_name,
        "gender": m.gender,
        "city": m.city,
        "status": m.status.value if hasattr(m.status, "value") else m.status,
        "joined_date": m.joined_date,
        "communication_preference": m.communication_preference,
        "emergency_contact_name": m.emergency_contact_name,
        "emergency_contact_phone": m.emergency_contact_phone,
        "notes": m.notes,
        "photo": meta.get("photo"),
        "date_of_birth": m.date_of_birth,
        "address": m.address,
        "state": m.state,
        "postal_code": m.postal_code,
        "created_at": m.created_at,
    }


@router.get("/")
async def list_members(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all members for the current vendor (paginated + searchable)"""
    query = db.query(Member).filter(
        Member.vendor_id == current_user.vendor_id,
        Member.deleted_at.is_(None),
    )

    if search:
        like = f"%{search.lower()}%"
        query = query.filter(or_(
            func.lower(Member.first_name).like(like),
            func.lower(Member.last_name).like(like),
            func.lower(Member.email).like(like),
            Member.phone.like(like),
        ))

    if status_filter:
        query = query.filter(Member.status == status_filter)

    total = query.count()
    members = (
        query.order_by(Member.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [_serialize(m) for m in members],
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_member(
    request: MemberCreate,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new member"""
    existing = db.query(Member).filter(
        Member.vendor_id == current_user.vendor_id,
        Member.email == request.email.lower().strip(),
        Member.deleted_at.is_(None),
    ).first()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "A member with this email already exists")

    try:
        member = Member(
            id=uuid.uuid4(),
            vendor_id=current_user.vendor_id,
            email=request.email.lower().strip(),
            phone=request.phone.strip(),
            first_name=request.first_name.strip(),
            last_name=(request.last_name or "").strip() or None,
            date_of_birth=request.date_of_birth,
            gender=request.gender,
            address=request.address,
            city=request.city,
            state=request.state,
            postal_code=request.postal_code,
            emergency_contact_name=request.emergency_contact_name,
            emergency_contact_phone=request.emergency_contact_phone,
            communication_preference=request.communication_preference or "whatsapp",
            status=MembershipStatus.TRIAL,
            joined_date=datetime.utcnow(),
            extra_metadata={"photo": request.photo} if request.photo else {},
        )
        db.add(member)

        # keep vendor current_members count in sync
        vendor = db.query(Vendor).filter(Vendor.id == current_user.vendor_id).first()
        if vendor:
            vendor.current_members = (vendor.current_members or 0) + 1

        db.commit()
        db.refresh(member)
        logger.info(f"Member created: {member.id} for vendor {current_user.vendor_id}")
        return _serialize(member)
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating member: {e}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not create member")


@router.get("/{member_id}")
async def get_member(
    member_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single member's details"""
    member = db.query(Member).filter(
        Member.id == member_id,
        Member.vendor_id == current_user.vendor_id,
        Member.deleted_at.is_(None),
    ).first()
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    return _serialize(member)


@router.put("/{member_id}")
async def update_member(
    member_id: str,
    request: MemberUpdate,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a member"""
    member = db.query(Member).filter(
        Member.id == member_id,
        Member.vendor_id == current_user.vendor_id,
        Member.deleted_at.is_(None),
    ).first()
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")

    data = request.dict(exclude_unset=True)
    photo = data.pop("photo", None)
    if photo is not None:
        meta = dict(member.extra_metadata or {})
        meta["photo"] = photo
        member.extra_metadata = meta
    for field, value in data.items():
        if field == "email" and value:
            value = value.lower().strip()
        setattr(member, field, value)

    db.commit()
    db.refresh(member)
    logger.info(f"Member updated: {member.id}")
    return _serialize(member)


@router.delete("/{member_id}")
async def delete_member(
    member_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Soft-delete a member"""
    member = db.query(Member).filter(
        Member.id == member_id,
        Member.vendor_id == current_user.vendor_id,
        Member.deleted_at.is_(None),
    ).first()
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")

    member.deleted_at = datetime.utcnow()
    vendor = db.query(Vendor).filter(Vendor.id == current_user.vendor_id).first()
    if vendor and (vendor.current_members or 0) > 0:
        vendor.current_members -= 1
    db.commit()
    logger.info(f"Member soft-deleted: {member.id}")
    return {"message": "Member deleted successfully", "id": str(member.id)}
