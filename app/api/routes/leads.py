from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from datetime import datetime
from typing import Optional
import uuid
import logging

from app.database import get_db
from app.models import Lead, LeadStatus, Member
from app.security import get_current_user, TokenData

logger = logging.getLogger(__name__)
router = APIRouter()


def _serialize(l: Lead) -> dict:
    return {
        "id": str(l.id),
        "first_name": l.first_name,
        "last_name": l.last_name,
        "email": l.email,
        "phone": l.phone,
        "source": l.source,
        "interest": l.interest,
        "status": l.status.value if hasattr(l.status, "value") else l.status,
        "assigned_to": str(l.assigned_to) if l.assigned_to else None,
        "follow_up_date": l.follow_up_date,
        "notes": l.notes,
        "converted_member_id": str(l.converted_member_id) if l.converted_member_id else None,
        "created_at": l.created_at,
        "updated_at": l.updated_at,
    }


@router.get("/")
async def list_leads(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    lead_status: Optional[str] = Query(None, alias="status"),
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Lead).filter(Lead.vendor_id == current_user.vendor_id)

    if search:
        like = f"%{search.lower()}%"
        query = query.filter(or_(
            func.lower(Lead.first_name).like(like),
            func.lower(Lead.last_name).like(like),
            Lead.phone.like(like),
            func.lower(Lead.email).like(like),
        ))

    if lead_status:
        query = query.filter(Lead.status == lead_status)

    total = query.count()
    items = (
        query.order_by(Lead.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {"total": total, "page": page, "page_size": page_size, "items": [_serialize(l) for l in items]}


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_lead(
    data: dict,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not data.get("first_name") or not data.get("phone"):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "first_name and phone are required")

    lead = Lead(
        id=uuid.uuid4(),
        vendor_id=current_user.vendor_id,
        first_name=data["first_name"].strip(),
        last_name=(data.get("last_name") or "").strip() or None,
        email=(data.get("email") or "").strip().lower() or None,
        phone=data["phone"].strip(),
        source=data.get("source"),
        interest=data.get("interest"),
        status=data.get("status", LeadStatus.NEW),
        follow_up_date=data.get("follow_up_date"),
        notes=data.get("notes"),
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return _serialize(lead)


@router.get("/{lead_id}")
async def get_lead(
    lead_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.vendor_id == current_user.vendor_id,
    ).first()
    if not lead:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lead not found")
    return _serialize(lead)


@router.put("/{lead_id}")
async def update_lead(
    lead_id: str,
    data: dict,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.vendor_id == current_user.vendor_id,
    ).first()
    if not lead:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lead not found")

    for field, value in data.items():
        if hasattr(lead, field) and field not in ("id", "vendor_id"):
            setattr(lead, field, value)

    db.commit()
    db.refresh(lead)
    return _serialize(lead)


@router.post("/{lead_id}/convert")
async def convert_lead(
    lead_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Convert a lead to a gym member"""
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.vendor_id == current_user.vendor_id,
    ).first()
    if not lead:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lead not found")

    existing = db.query(Member).filter(
        Member.vendor_id == current_user.vendor_id,
        Member.phone == lead.phone,
        Member.deleted_at.is_(None),
    ).first()
    if existing:
        lead.status = LeadStatus.CONVERTED
        lead.converted_member_id = existing.id
        db.commit()
        return {"message": "Lead marked as converted", "member_id": str(existing.id)}

    member = Member(
        id=uuid.uuid4(),
        vendor_id=current_user.vendor_id,
        email=lead.email or f"lead_{str(lead.id)[:8]}@placeholder.com",
        phone=lead.phone,
        first_name=lead.first_name,
        last_name=lead.last_name,
        notes=lead.notes,
        joined_date=datetime.utcnow(),
    )
    db.add(member)
    lead.status = LeadStatus.CONVERTED
    lead.converted_member_id = member.id
    db.commit()
    return {"message": "Lead converted to member", "member_id": str(member.id)}


@router.delete("/{lead_id}")
async def delete_lead(
    lead_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.vendor_id == current_user.vendor_id,
    ).first()
    if not lead:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lead not found")

    db.delete(lead)
    db.commit()
    return {"message": "Lead deleted", "id": lead_id}


@router.get("/stats/summary")
async def lead_stats(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vid = current_user.vendor_id
    counts = {}
    for s in LeadStatus:
        counts[s.value] = db.query(func.count(Lead.id)).filter(
            Lead.vendor_id == vid, Lead.status == s
        ).scalar() or 0

    return {"by_status": counts, "total": sum(counts.values())}
