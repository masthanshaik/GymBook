from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
import uuid
import logging

from app.database import get_db
from app.models import Class, ClassSchedule, ClassMember, Member
from app.schemas import ClassCreate, ClassUpdate, ClassScheduleCreate
from app.security import get_current_user, TokenData

logger = logging.getLogger(__name__)
router = APIRouter()


def _class(c: Class) -> dict:
    return {
        "id": str(c.id),
        "name": c.name,
        "description": c.description,
        "class_type": c.class_type,
        "capacity": c.capacity,
        "current_enrollment": c.current_enrollment,
        "level": c.level,
        "is_active": c.is_active,
        "created_at": c.created_at,
    }


@router.get("/")
async def list_classes(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all classes for the vendor"""
    classes = db.query(Class).filter(
        Class.vendor_id == current_user.vendor_id,
    ).order_by(Class.created_at.desc()).all()
    return {"items": [_class(c) for c in classes], "total": len(classes)}


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_class(
    request: ClassCreate,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new class"""
    try:
        cls = Class(
            id=uuid.uuid4(),
            vendor_id=current_user.vendor_id,
            trainer_id=request.trainer_id,
            name=request.name.strip(),
            description=request.description,
            class_type=request.class_type,
            capacity=request.capacity,
            current_enrollment=0,
            level=request.level or "beginner",
            is_active=True,
        )
        db.add(cls)
        db.commit()
        db.refresh(cls)
        logger.info(f"Class created: {cls.id}")
        return _class(cls)
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating class: {e}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not create class")


@router.get("/{class_id}")
async def get_class(
    class_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get class details with schedules"""
    cls = db.query(Class).filter(
        Class.id == class_id,
        Class.vendor_id == current_user.vendor_id,
    ).first()
    if not cls:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Class not found")

    schedules = db.query(ClassSchedule).filter(ClassSchedule.class_id == cls.id).all()
    data = _class(cls)
    data["schedules"] = [
        {
            "id": str(s.id),
            "day_of_week": s.day_of_week,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "location": s.location,
        }
        for s in schedules
    ]
    return data


@router.put("/{class_id}")
async def update_class(
    class_id: str,
    request: ClassUpdate,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a class"""
    cls = db.query(Class).filter(
        Class.id == class_id,
        Class.vendor_id == current_user.vendor_id,
    ).first()
    if not cls:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Class not found")
    for field, value in request.dict(exclude_unset=True).items():
        setattr(cls, field, value)
    db.commit()
    db.refresh(cls)
    return _class(cls)


@router.post("/{class_id}/schedule", status_code=status.HTTP_201_CREATED)
async def add_schedule(
    class_id: str,
    request: ClassScheduleCreate,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a recurring schedule slot to a class"""
    cls = db.query(Class).filter(
        Class.id == class_id,
        Class.vendor_id == current_user.vendor_id,
    ).first()
    if not cls:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Class not found")

    sched = ClassSchedule(
        id=uuid.uuid4(),
        class_id=cls.id,
        day_of_week=request.day_of_week,
        start_time=request.start_time,
        end_time=request.end_time,
        location=request.location,
    )
    db.add(sched)
    db.commit()
    db.refresh(sched)
    return {
        "id": str(sched.id),
        "class_id": str(cls.id),
        "day_of_week": sched.day_of_week,
        "start_time": sched.start_time,
        "end_time": sched.end_time,
        "location": sched.location,
    }


@router.post("/{class_id}/enroll")
async def enroll_member(
    class_id: str,
    member_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Enroll a member in a class"""
    cls = db.query(Class).filter(
        Class.id == class_id,
        Class.vendor_id == current_user.vendor_id,
    ).first()
    if not cls:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Class not found")

    member = db.query(Member).filter(
        Member.id == member_id,
        Member.vendor_id == current_user.vendor_id,
    ).first()
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")

    if cls.current_enrollment >= cls.capacity:
        raise HTTPException(status.HTTP_409_CONFLICT, "Class is full")

    existing = db.query(ClassMember).filter(
        ClassMember.class_id == cls.id,
        ClassMember.member_id == member.id,
    ).first()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Member already enrolled")

    enrollment = ClassMember(
        id=uuid.uuid4(),
        class_id=cls.id,
        member_id=member.id,
        enrolled_date=datetime.utcnow(),
    )
    db.add(enrollment)
    cls.current_enrollment += 1
    db.commit()
    return {"message": "Member enrolled", "class_id": str(cls.id), "member_id": str(member.id)}
