from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
import uuid
import logging

from app.database import get_db
from app.models import Attendance, Member, AttendanceStatus
from app.schemas import AttendanceCheckIn, AttendanceCheckOut
from app.security import get_current_user, TokenData

logger = logging.getLogger(__name__)
router = APIRouter()


def _att(a: Attendance) -> dict:
    return {
        "id": str(a.id),
        "member_id": str(a.member_id),
        "class_id": str(a.class_id) if a.class_id else None,
        "check_in_time": a.check_in_time,
        "check_out_time": a.check_out_time,
        "status": a.status.value if hasattr(a.status, "value") else a.status,
        "duration_minutes": a.duration_minutes,
    }


@router.post("/check-in", status_code=status.HTTP_201_CREATED)
async def check_in(
    request: AttendanceCheckIn,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check a member in"""
    member = db.query(Member).filter(
        Member.id == request.member_id,
        Member.vendor_id == current_user.vendor_id,
    ).first()
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")

    open_rec = db.query(Attendance).filter(
        Attendance.member_id == request.member_id,
        Attendance.status == AttendanceStatus.CHECKED_IN,
    ).first()
    if open_rec:
        raise HTTPException(status.HTTP_409_CONFLICT, "Member is already checked in")

    att = Attendance(
        id=uuid.uuid4(),
        vendor_id=current_user.vendor_id,
        member_id=member.id,
        class_id=request.class_id,
        check_in_time=datetime.utcnow(),
        status=AttendanceStatus.CHECKED_IN,
        check_in_method=request.check_in_method or "manual",
        check_in_device_id=request.device_id,
    )
    db.add(att)
    db.commit()
    db.refresh(att)
    logger.info(f"Check-in: member {member.id}")
    return _att(att)


@router.post("/check-out")
async def check_out(
    request: AttendanceCheckOut,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check a member out (closes the open attendance record)"""
    att = db.query(Attendance).filter(
        Attendance.member_id == request.member_id,
        Attendance.vendor_id == current_user.vendor_id,
        Attendance.status == AttendanceStatus.CHECKED_IN,
    ).order_by(Attendance.check_in_time.desc()).first()
    if not att:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No active check-in found")

    att.check_out_time = datetime.utcnow()
    att.status = AttendanceStatus.CHECKED_OUT
    delta = att.check_out_time - att.check_in_time
    att.duration_minutes = int(delta.total_seconds() // 60)
    db.commit()
    db.refresh(att)
    return _att(att)


@router.get("/report")
async def attendance_report(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """High-level attendance stats for the last 30 days"""
    since = datetime.utcnow() - timedelta(days=30)
    total = db.query(func.count(Attendance.id)).filter(
        Attendance.vendor_id == current_user.vendor_id,
        Attendance.check_in_time >= since,
    ).scalar() or 0

    today = datetime.utcnow().date()
    today_count = db.query(func.count(Attendance.id)).filter(
        Attendance.vendor_id == current_user.vendor_id,
        func.date(Attendance.check_in_time) == today,
    ).scalar() or 0

    return {
        "total_check_ins_30d": total,
        "today_check_ins": today_count,
        "average_daily": round(total / 30, 1),
    }


@router.get("/member/{member_id}")
async def member_attendance(
    member_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a member's attendance history"""
    records = db.query(Attendance).filter(
        Attendance.member_id == member_id,
        Attendance.vendor_id == current_user.vendor_id,
    ).order_by(Attendance.check_in_time.desc()).limit(100).all()
    return {"items": [_att(a) for a in records], "total": len(records)}
