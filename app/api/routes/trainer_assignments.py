from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.database import get_db
from app.models import TrainerMemberAssignment, Member, User, UserRole
from app.security import get_current_user, TokenData

router = APIRouter()


def _assignment_dict(a: TrainerMemberAssignment, trainer_name="", member_name="") -> dict:
    return {
        "id": str(a.id), "vendor_id": str(a.vendor_id),
        "trainer_id": str(a.trainer_id), "member_id": str(a.member_id),
        "assigned_date": a.assigned_date.isoformat() if a.assigned_date else None,
        "end_date": a.end_date.isoformat() if a.end_date else None,
        "is_active": a.is_active, "monthly_fee": a.monthly_fee, "notes": a.notes,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "trainer_name": trainer_name, "member_name": member_name,
    }


@router.get("")
def list_assignments(
    trainer_id: str = None,
    member_id: str = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    q = db.query(TrainerMemberAssignment).filter(TrainerMemberAssignment.vendor_id == current_user.vendor_id)
    if trainer_id:
        q = q.filter(TrainerMemberAssignment.trainer_id == trainer_id)
    if member_id:
        q = q.filter(TrainerMemberAssignment.member_id == member_id)
    if active_only:
        q = q.filter(TrainerMemberAssignment.is_active == True)
    assignments = q.order_by(TrainerMemberAssignment.created_at.desc()).all()

    trainer_map = {str(u.id): f"{u.first_name} {u.last_name}" for u in
                   db.query(User).filter(User.vendor_id == current_user.vendor_id).all()}
    member_map = {str(m.id): f"{m.first_name} {m.last_name}" for m in
                  db.query(Member).filter(Member.vendor_id == current_user.vendor_id, Member.deleted_at.is_(None)).all()}

    return [_assignment_dict(a, trainer_map.get(str(a.trainer_id), ""), member_map.get(str(a.member_id), ""))
            for a in assignments]


@router.get("/trainers")
def list_trainers(db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    """Return all staff users who can be assigned as trainers"""
    trainers = db.query(User).filter(
        User.vendor_id == current_user.vendor_id,
        User.is_active == True,
        User.role.in_([UserRole.TRAINER, UserRole.GYM_MANAGER, UserRole.GYM_OWNER]),
    ).all()
    return [{"id": str(u.id), "name": f"{u.first_name} {u.last_name}", "role": u.role.value, "email": u.email}
            for u in trainers]


@router.get("/trainer-summary")
def trainer_summary(db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    """Count of active members per trainer"""
    trainers = db.query(User).filter(User.vendor_id == current_user.vendor_id, User.is_active == True).all()
    result = []
    for t in trainers:
        count = db.query(TrainerMemberAssignment).filter(
            TrainerMemberAssignment.vendor_id == current_user.vendor_id,
            TrainerMemberAssignment.trainer_id == t.id,
            TrainerMemberAssignment.is_active == True,
        ).count()
        result.append({"trainer_id": str(t.id), "trainer_name": f"{t.first_name} {t.last_name}",
                        "role": t.role.value, "member_count": count})
    return result


@router.post("", status_code=status.HTTP_201_CREATED)
def assign_trainer(data: dict = Body(...), db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    trainer = db.query(User).filter(User.id == data.get("trainer_id"), User.vendor_id == current_user.vendor_id).first()
    if not trainer:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trainer not found")

    member = db.query(Member).filter(Member.id == data.get("member_id"), Member.vendor_id == current_user.vendor_id).first()
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")

    # Deactivate existing active assignment for this member (one trainer at a time)
    db.query(TrainerMemberAssignment).filter(
        TrainerMemberAssignment.vendor_id == current_user.vendor_id,
        TrainerMemberAssignment.member_id == member.id,
        TrainerMemberAssignment.is_active == True,
    ).update({"is_active": False, "end_date": datetime.utcnow()})

    a = TrainerMemberAssignment(
        id=uuid.uuid4(), vendor_id=current_user.vendor_id,
        trainer_id=trainer.id, member_id=member.id,
        monthly_fee=float(data["monthly_fee"]) if data.get("monthly_fee") else None,
        notes=data.get("notes"), is_active=True,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return _assignment_dict(a, f"{trainer.first_name} {trainer.last_name}", f"{member.first_name} {member.last_name}")


@router.patch("/{assignment_id}")
def update_assignment(assignment_id: str, data: dict = Body(...), db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    a = db.query(TrainerMemberAssignment).filter(
        TrainerMemberAssignment.id == assignment_id,
        TrainerMemberAssignment.vendor_id == current_user.vendor_id,
    ).first()
    if not a:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assignment not found")
    for field in ("is_active", "monthly_fee", "notes", "end_date"):
        if field in data:
            setattr(a, field, data[field])
    if "is_active" in data and not data["is_active"]:
        a.end_date = a.end_date or datetime.utcnow()
    db.commit()
    db.refresh(a)
    return _assignment_dict(a)


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(assignment_id: str, db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    a = db.query(TrainerMemberAssignment).filter(
        TrainerMemberAssignment.id == assignment_id,
        TrainerMemberAssignment.vendor_id == current_user.vendor_id,
    ).first()
    if not a:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assignment not found")
    db.delete(a)
    db.commit()
