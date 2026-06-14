from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import jwt
import uuid

from app.database import get_db
from app.models import Member, Membership, Attendance, FitnessGoal, BodyMeasurement, MembershipPlan
from app.security import PasswordManager
from app.config import settings

router = APIRouter()

_PORTAL_SECRET = settings.SECRET_KEY + "_portal"
_ALGORITHM = settings.ALGORITHM


def _create_portal_token(member_id: str, vendor_id: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=24)
    return jwt.encode(
        {"member_id": member_id, "vendor_id": vendor_id, "exp": expire, "type": "member_portal"},
        _PORTAL_SECRET,
        algorithm=_ALGORITHM,
    )


def _verify_portal_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, _PORTAL_SECRET, algorithms=[_ALGORITHM])
        if payload.get("type") != "member_portal":
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid portal token")
        return payload
    except Exception:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")


def get_portal_member(
    authorization: str = None,
    db: Session = Depends(get_db),
):
    from fastapi import Request
    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Use /member-portal/login first")


from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Security

_bearer = HTTPBearer()


def portal_auth(
    credentials: HTTPAuthorizationCredentials = Security(_bearer),
    db: Session = Depends(get_db),
) -> Member:
    payload = _verify_portal_token(credentials.credentials)
    member = db.query(Member).filter(
        Member.id == payload["member_id"],
        Member.deleted_at.is_(None),
    ).first()
    if not member:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Member not found")
    return member


@router.post("/login")
def member_login(
    data: dict = Body(...),
    db: Session = Depends(get_db),
):
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    member = db.query(Member).filter(
        Member.email == email,
        Member.deleted_at.is_(None),
    ).first()

    if not member or not member.password_hash:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    if not PasswordManager.verify_password(password, member.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    token = _create_portal_token(str(member.id), str(member.vendor_id))
    return {
        "access_token": token,
        "token_type": "bearer",
        "member": {
            "id": str(member.id),
            "first_name": member.first_name,
            "last_name": member.last_name,
            "email": member.email,
            "phone": member.phone,
        },
    }


@router.post("/set-password")
def set_member_password(
    data: dict = Body(...),
    db: Session = Depends(get_db),
):
    """Allow gym staff to set/reset a member's portal password."""
    member_id = data.get("member_id")
    new_password = data.get("password") or ""
    if len(new_password) < 8:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Password must be at least 8 characters")

    member = db.query(Member).filter(
        Member.id == member_id,
        Member.deleted_at.is_(None),
    ).first()
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")

    member.password_hash = PasswordManager.hash_password(new_password)
    db.commit()
    return {"message": "Portal password set successfully"}


@router.get("/me")
def get_me(member: Member = Depends(portal_auth)):
    return {
        "id": str(member.id),
        "first_name": member.first_name,
        "last_name": member.last_name,
        "email": member.email,
        "phone": member.phone,
        "gender": member.gender,
        "city": member.city,
        "joined_date": member.joined_date.isoformat() if member.joined_date else None,
        "status": member.status.value if member.status else None,
    }


@router.get("/memberships")
def get_my_memberships(
    member: Member = Depends(portal_auth),
    db: Session = Depends(get_db),
):
    memberships = db.query(Membership).filter(
        Membership.member_id == member.id
    ).order_by(Membership.started_date.desc()).all()

    result = []
    for m in memberships:
        plan = db.query(MembershipPlan).filter(MembershipPlan.id == m.plan_id).first()
        result.append({
            "id": str(m.id),
            "plan_name": plan.name if plan else "Unknown",
            "plan_duration_months": plan.duration_months if plan else None,
            "status": m.status.value if m.status else None,
            "started_date": m.started_date.isoformat() if m.started_date else None,
            "ended_date": m.ended_date.isoformat() if m.ended_date else None,
            "final_price": m.final_price,
        })
    return result


@router.get("/attendance")
def get_my_attendance(
    member: Member = Depends(portal_auth),
    db: Session = Depends(get_db),
):
    records = db.query(Attendance).filter(
        Attendance.member_id == member.id
    ).order_by(Attendance.check_in_time.desc()).limit(60).all()

    return [
        {
            "id": str(r.id),
            "check_in_time": r.check_in_time.isoformat() if r.check_in_time else None,
            "check_out_time": r.check_out_time.isoformat() if r.check_out_time else None,
            "duration_minutes": r.duration_minutes,
            "status": r.status.value if r.status else None,
        }
        for r in records
    ]


@router.get("/goals")
def get_my_goals(
    member: Member = Depends(portal_auth),
    db: Session = Depends(get_db),
):
    goals = db.query(FitnessGoal).filter(
        FitnessGoal.member_id == member.id
    ).order_by(FitnessGoal.created_at.desc()).all()

    return [
        {
            "id": str(g.id),
            "goal_type": g.goal_type.value if g.goal_type else None,
            "title": g.title,
            "description": g.description,
            "target_value": g.target_value,
            "target_unit": g.target_unit,
            "current_value": g.current_value,
            "deadline": g.deadline.isoformat() if g.deadline else None,
            "status": g.status.value if g.status else None,
        }
        for g in goals
    ]


@router.get("/measurements")
def get_my_measurements(
    member: Member = Depends(portal_auth),
    db: Session = Depends(get_db),
):
    records = db.query(BodyMeasurement).filter(
        BodyMeasurement.member_id == member.id
    ).order_by(BodyMeasurement.recorded_date.desc()).limit(20).all()

    return [
        {
            "id": str(r.id),
            "recorded_date": r.recorded_date.isoformat() if r.recorded_date else None,
            "weight_kg": r.weight_kg,
            "height_cm": r.height_cm,
            "bmi": r.bmi,
            "body_fat_pct": r.body_fat_pct,
            "muscle_mass_kg": r.muscle_mass_kg,
            "chest_cm": r.chest_cm,
            "waist_cm": r.waist_cm,
            "hips_cm": r.hips_cm,
        }
        for r in records
    ]
