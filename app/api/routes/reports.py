from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.database import get_db
from app.models import (
    Member, Payment, Attendance, Membership,
    PaymentStatus, MembershipStatus,
)
from app.security import get_current_user, TokenData

router = APIRouter()


@router.get("/dashboard")
async def dashboard_summary(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Single endpoint powering the dashboard cards with real numbers."""
    vid = current_user.vendor_id
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total_members = db.query(func.count(Member.id)).filter(
        Member.vendor_id == vid, Member.deleted_at.is_(None)
    ).scalar() or 0

    active_members = db.query(func.count(Member.id)).filter(
        Member.vendor_id == vid, Member.deleted_at.is_(None),
        Member.status == MembershipStatus.ACTIVE,
    ).scalar() or 0

    monthly_revenue = db.query(func.coalesce(func.sum(Payment.amount), 0.0)).filter(
        Payment.vendor_id == vid,
        Payment.status == PaymentStatus.COMPLETED,
        Payment.completed_at >= month_start,
    ).scalar() or 0.0

    renewals_this_month = db.query(func.count(Membership.id)).filter(
        Membership.vendor_id == vid,
        Membership.updated_at >= month_start,
        Membership.status == MembershipStatus.ACTIVE,
    ).scalar() or 0

    today = now.date()
    todays_checkins = db.query(func.count(Attendance.id)).filter(
        Attendance.vendor_id == vid,
        func.date(Attendance.check_in_time) == today,
    ).scalar() or 0

    # memberships expiring within 7 days or already expired (needs attention)
    week_ahead = now + timedelta(days=7)
    expiring_soon = db.query(func.count(Membership.id)).filter(
        Membership.vendor_id == vid,
        Membership.status.in_([MembershipStatus.ACTIVE, MembershipStatus.EXPIRED]),
        Membership.ended_date <= week_ahead,
    ).scalar() or 0

    return {
        "total_members": total_members,
        "active_members": active_members,
        "monthly_revenue": round(float(monthly_revenue), 2),
        "renewals_this_month": renewals_this_month,
        "todays_checkins": todays_checkins,
        "renewals_due": expiring_soon,
    }


@router.get("/financial")
async def financial_report(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Financial summary for the last 30 days."""
    vid = current_user.vendor_id
    since = datetime.utcnow() - timedelta(days=30)

    completed = db.query(Payment).filter(
        Payment.vendor_id == vid,
        Payment.status == PaymentStatus.COMPLETED,
        Payment.completed_at >= since,
    ).all()

    total_revenue = sum(p.amount for p in completed)
    refunds = db.query(func.coalesce(func.sum(Payment.refund_amount), 0.0)).filter(
        Payment.vendor_id == vid, Payment.is_refunded == True,  # noqa: E712
        Payment.refund_date >= since,
    ).scalar() or 0.0

    by_method = {}
    for p in completed:
        key = p.payment_method.value if hasattr(p.payment_method, "value") else str(p.payment_method)
        by_method[key] = round(by_method.get(key, 0.0) + p.amount, 2)

    count = len(completed)
    return {
        "total_revenue": round(total_revenue, 2),
        "total_refunds": round(float(refunds), 2),
        "net_revenue": round(total_revenue - float(refunds), 2),
        "payment_methods": by_method,
        "transactions_count": count,
        "average_transaction": round(total_revenue / count, 2) if count else 0,
        "period": "last_30_days",
    }


@router.get("/members")
async def members_report(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Member statistics."""
    vid = current_user.vendor_id
    base = db.query(func.count(Member.id)).filter(
        Member.vendor_id == vid, Member.deleted_at.is_(None)
    )
    total = base.scalar() or 0

    def count_status(s):
        return db.query(func.count(Member.id)).filter(
            Member.vendor_id == vid, Member.deleted_at.is_(None), Member.status == s
        ).scalar() or 0

    active = count_status(MembershipStatus.ACTIVE)
    inactive = count_status(MembershipStatus.INACTIVE)
    expired = count_status(MembershipStatus.EXPIRED)

    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    new_this_month = db.query(func.count(Member.id)).filter(
        Member.vendor_id == vid, Member.deleted_at.is_(None),
        Member.joined_date >= month_start,
    ).scalar() or 0

    return {
        "total_members": total,
        "active_members": active,
        "inactive_members": inactive,
        "expired_members": expired,
        "new_members_this_month": new_this_month,
        "retention_rate": round((active / total * 100), 1) if total else 0,
    }


@router.get("/attendance")
async def attendance_report(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Attendance statistics for the last 30 days."""
    vid = current_user.vendor_id
    since = datetime.utcnow() - timedelta(days=30)
    total = db.query(func.count(Attendance.id)).filter(
        Attendance.vendor_id == vid, Attendance.check_in_time >= since
    ).scalar() or 0
    return {
        "total_check_ins": total,
        "average_daily_attendance": round(total / 30, 1),
        "period": "last_30_days",
    }


def _month_buckets(n=6):
    """Return list of (year, month, label) for the last n months, oldest first."""
    out = []
    now = datetime.utcnow()
    y, m = now.year, now.month
    for _ in range(n):
        out.append((y, m, datetime(y, m, 1).strftime("%b")))
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    return list(reversed(out))


@router.get("/charts")
async def charts_data(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revenue trend and member growth for the last 6 months (for dashboard charts)."""
    vid = current_user.vendor_id
    buckets = _month_buckets(6)

    revenue_series = []
    members_series = []
    for (y, m, label) in buckets:
        start = datetime(y, m, 1)
        end = datetime(y + (1 if m == 12 else 0), 1 if m == 12 else m + 1, 1)

        rev = db.query(func.coalesce(func.sum(Payment.amount), 0.0)).filter(
            Payment.vendor_id == vid,
            Payment.status == PaymentStatus.COMPLETED,
            Payment.completed_at >= start,
            Payment.completed_at < end,
        ).scalar() or 0.0
        revenue_series.append({"month": label, "revenue": round(float(rev), 2)})

        joined = db.query(func.count(Member.id)).filter(
            Member.vendor_id == vid,
            Member.deleted_at.is_(None),
            Member.joined_date >= start,
            Member.joined_date < end,
        ).scalar() or 0
        members_series.append({"month": label, "members": joined})

    return {"revenue_trend": revenue_series, "member_growth": members_series}


@router.get("/member-detail/{member_id}")
async def member_detail(
    member_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Aggregate view for a single member: profile + memberships + payments + attendance."""
    member = db.query(Member).filter(
        Member.id == member_id,
        Member.vendor_id == current_user.vendor_id,
        Member.deleted_at.is_(None),
    ).first()
    if not member:
        from fastapi import HTTPException, status as st
        raise HTTPException(st.HTTP_404_NOT_FOUND, "Member not found")

    memberships = db.query(Membership).filter(
        Membership.member_id == member.id
    ).order_by(Membership.created_at.desc()).all()

    payments = db.query(Payment).filter(
        Payment.member_id == member.id
    ).order_by(Payment.initiated_at.desc()).limit(20).all()

    attendance = db.query(Attendance).filter(
        Attendance.member_id == member.id
    ).order_by(Attendance.check_in_time.desc()).limit(20).all()

    total_paid = sum(
        p.amount for p in payments
        if (p.status.value if hasattr(p.status, "value") else p.status) == "completed"
    )

    return {
        "member": {
            "id": str(member.id),
            "first_name": member.first_name,
            "last_name": member.last_name,
            "email": member.email,
            "phone": member.phone,
            "status": member.status.value if hasattr(member.status, "value") else member.status,
            "city": member.city,
            "joined_date": member.joined_date,
        },
        "memberships": [
            {
                "id": str(ms.id),
                "status": ms.status.value if hasattr(ms.status, "value") else ms.status,
                "started_date": ms.started_date,
                "ended_date": ms.ended_date,
                "final_price": ms.final_price,
            }
            for ms in memberships
        ],
        "payments": [
            {
                "id": str(p.id),
                "amount": p.amount,
                "status": p.status.value if hasattr(p.status, "value") else p.status,
                "purpose": p.purpose,
                "initiated_at": p.initiated_at,
            }
            for p in payments
        ],
        "attendance": [
            {
                "id": str(a.id),
                "check_in_time": a.check_in_time,
                "check_out_time": a.check_out_time,
                "duration_minutes": a.duration_minutes,
            }
            for a in attendance
        ],
        "stats": {
            "total_paid": round(total_paid, 2),
            "total_visits": len(attendance),
            "active_memberships": sum(
                1 for ms in memberships
                if (ms.status.value if hasattr(ms.status, "value") else ms.status) == "active"
            ),
        },
    }
