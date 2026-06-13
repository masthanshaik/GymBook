from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid
import logging

from app.database import get_db
from app.models import (
    MembershipPlan, Membership, Member, MembershipStatus,
)
from app.schemas import MembershipPlanCreate, MembershipPlanUpdate, MembershipCreate
from app.security import get_current_user, TokenData

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/renewals")
async def renewals_due(
    days: int = 7,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Auto renewal reminders: memberships expiring within `days` days, plus any
    already expired. Also auto-flips past-due active memberships to EXPIRED."""
    vid = current_user.vendor_id
    now = datetime.utcnow()
    cutoff = now + timedelta(days=days)

    # Auto-expire anything past its end date that's still marked active
    stale = db.query(Membership).filter(
        Membership.vendor_id == vid,
        Membership.status == MembershipStatus.ACTIVE,
        Membership.ended_date < now,
    ).all()
    for ms in stale:
        ms.status = MembershipStatus.EXPIRED
    if stale:
        db.commit()

    # Pull memberships ending on/before the cutoff (expiring soon OR expired)
    rows = db.query(Membership).filter(
        Membership.vendor_id == vid,
        Membership.status.in_([MembershipStatus.ACTIVE, MembershipStatus.EXPIRED]),
        Membership.ended_date <= cutoff,
    ).order_by(Membership.ended_date.asc()).all()

    expiring, expired = [], []
    for ms in rows:
        member = db.query(Member).filter(Member.id == ms.member_id).first()
        plan = db.query(MembershipPlan).filter(MembershipPlan.id == ms.plan_id).first()
        if not member or member.deleted_at is not None:
            continue
        days_left = (ms.ended_date - now).days
        item = {
            "membership_id": str(ms.id),
            "member_id": str(member.id),
            "member_name": f"{member.first_name} {member.last_name or ''}".strip(),
            "member_email": member.email,
            "member_phone": member.phone,
            "plan_name": plan.name if plan else "—",
            "ended_date": ms.ended_date,
            "days_left": days_left,
            "final_price": ms.final_price,
            "is_auto_renew": ms.is_auto_renew,
        }
        if days_left < 0:
            expired.append(item)
        else:
            expiring.append(item)

    return {
        "window_days": days,
        "expiring_soon": expiring,
        "expired": expired,
        "expiring_count": len(expiring),
        "expired_count": len(expired),
        "total": len(expiring) + len(expired),
    }


def _plan(p: MembershipPlan) -> dict:
    return {
        "id": str(p.id),
        "name": p.name,
        "description": p.description,
        "duration_months": p.duration_months,
        "price": p.price,
        "class_limit_per_week": p.class_limit_per_week,
        "trainer_access": p.trainer_access,
        "facility_access": p.facility_access,
        "is_active": p.is_active,
        "is_trial_plan": p.is_trial_plan,
        "created_at": p.created_at,
    }


def _membership(m: Membership) -> dict:
    return {
        "id": str(m.id),
        "member_id": str(m.member_id),
        "plan_id": str(m.plan_id),
        "status": m.status.value if hasattr(m.status, "value") else m.status,
        "started_date": m.started_date,
        "ended_date": m.ended_date,
        "original_price": m.original_price,
        "discount_applied": m.discount_applied,
        "final_price": m.final_price,
        "is_auto_renew": m.is_auto_renew,
        "created_at": m.created_at,
    }


# ---------- PLANS ----------

@router.get("/plans")
async def list_membership_plans(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all membership plans for the vendor"""
    plans = db.query(MembershipPlan).filter(
        MembershipPlan.vendor_id == current_user.vendor_id
    ).order_by(MembershipPlan.price.asc()).all()
    return {"items": [_plan(p) for p in plans], "total": len(plans)}


@router.post("/plans", status_code=status.HTTP_201_CREATED)
async def create_membership_plan(
    request: MembershipPlanCreate,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new membership plan"""
    try:
        plan = MembershipPlan(
            id=uuid.uuid4(),
            vendor_id=current_user.vendor_id,
            name=request.name.strip(),
            description=request.description,
            duration_months=request.duration_months,
            price=request.price,
            class_limit_per_week=request.class_limit_per_week,
            trainer_access=request.trainer_access,
            facility_access=request.facility_access or [],
            is_trial_plan=request.is_trial_plan,
            trial_duration_days=request.trial_duration_days,
            is_active=True,
        )
        db.add(plan)
        db.commit()
        db.refresh(plan)
        logger.info(f"Plan created: {plan.id}")
        return _plan(plan)
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating plan: {e}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not create plan")


@router.put("/plans/{plan_id}")
async def update_membership_plan(
    plan_id: str,
    request: MembershipPlanUpdate,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a membership plan"""
    plan = db.query(MembershipPlan).filter(
        MembershipPlan.id == plan_id,
        MembershipPlan.vendor_id == current_user.vendor_id,
    ).first()
    if not plan:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Plan not found")

    for field, value in request.dict(exclude_unset=True).items():
        setattr(plan, field, value)
    db.commit()
    db.refresh(plan)
    return _plan(plan)


@router.delete("/plans/{plan_id}")
async def delete_membership_plan(
    plan_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Deactivate a membership plan"""
    plan = db.query(MembershipPlan).filter(
        MembershipPlan.id == plan_id,
        MembershipPlan.vendor_id == current_user.vendor_id,
    ).first()
    if not plan:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Plan not found")
    plan.is_active = False
    db.commit()
    return {"message": "Plan deactivated", "id": str(plan.id)}


# ---------- MEMBERSHIPS (assignment) ----------

@router.post("/", status_code=status.HTTP_201_CREATED)
async def assign_membership(
    request: MembershipCreate,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Assign a plan to a member (creates an active membership)"""
    member = db.query(Member).filter(
        Member.id == request.member_id,
        Member.vendor_id == current_user.vendor_id,
    ).first()
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")

    plan = db.query(MembershipPlan).filter(
        MembershipPlan.id == request.plan_id,
        MembershipPlan.vendor_id == current_user.vendor_id,
    ).first()
    if not plan:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Plan not found")

    try:
        started = request.started_date or datetime.utcnow()
        if request.ended_date:
            ended = request.ended_date
        else:
            ended = started + timedelta(days=30 * plan.duration_months)
        discount = request.discount_applied or 0
        final = max(0.0, request.original_price - discount)

        membership = Membership(
            id=uuid.uuid4(),
            vendor_id=current_user.vendor_id,
            member_id=member.id,
            plan_id=plan.id,
            status=MembershipStatus.ACTIVE,
            started_date=started,
            ended_date=ended,
            original_price=request.original_price,
            discount_applied=discount,
            final_price=final,
        )
        db.add(membership)
        member.status = MembershipStatus.ACTIVE
        db.commit()
        db.refresh(membership)
        logger.info(f"Membership assigned: {membership.id}")
        return _membership(membership)
    except Exception as e:
        db.rollback()
        logger.error(f"Error assigning membership: {e}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not assign membership")


@router.get("/{membership_id}")
async def get_membership(
    membership_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get membership details"""
    m = db.query(Membership).filter(
        Membership.id == membership_id,
        Membership.vendor_id == current_user.vendor_id,
    ).first()
    if not m:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Membership not found")
    return _membership(m)


@router.post("/{membership_id}/renew")
async def renew_membership(
    membership_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Renew a membership by its plan duration"""
    m = db.query(Membership).filter(
        Membership.id == membership_id,
        Membership.vendor_id == current_user.vendor_id,
    ).first()
    if not m:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Membership not found")

    plan = db.query(MembershipPlan).filter(MembershipPlan.id == m.plan_id).first()
    months = plan.duration_months if plan else 1
    base = m.ended_date if m.ended_date and m.ended_date > datetime.utcnow() else datetime.utcnow()
    m.ended_date = base + timedelta(days=30 * months)
    m.status = MembershipStatus.ACTIVE
    db.commit()
    db.refresh(m)
    logger.info(f"Membership renewed: {m.id}")
    return _membership(m)


@router.post("/{membership_id}/cancel")
async def cancel_membership(
    membership_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel a membership"""
    m = db.query(Membership).filter(
        Membership.id == membership_id,
        Membership.vendor_id == current_user.vendor_id,
    ).first()
    if not m:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Membership not found")
    m.status = MembershipStatus.INACTIVE
    m.is_auto_renew = False
    db.commit()
    return {"message": "Membership cancelled", "id": str(m.id)}
