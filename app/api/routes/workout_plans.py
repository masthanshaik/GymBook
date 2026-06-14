from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.database import get_db
from app.models import WorkoutPlan, WorkoutExercise, MemberWorkoutPlan, Member, User
from app.security import get_current_user, TokenData

router = APIRouter()


def _exercise_dict(e: WorkoutExercise) -> dict:
    return {
        "id": str(e.id), "plan_id": str(e.plan_id), "day_number": e.day_number,
        "exercise_name": e.exercise_name, "sets": e.sets, "reps": e.reps,
        "duration_seconds": e.duration_seconds, "rest_seconds": e.rest_seconds,
        "notes": e.notes, "order_index": e.order_index,
    }


def _plan_dict(p: WorkoutPlan, include_exercises=True) -> dict:
    d = {
        "id": str(p.id), "vendor_id": str(p.vendor_id), "name": p.name,
        "description": p.description, "goal_type": p.goal_type, "level": p.level,
        "duration_weeks": p.duration_weeks, "sessions_per_week": p.sessions_per_week,
        "is_active": p.is_active, "created_at": p.created_at.isoformat() if p.created_at else None,
    }
    if include_exercises:
        d["exercises"] = [_exercise_dict(e) for e in p.exercises]
    return d


def _assignment_dict(a: MemberWorkoutPlan, plan_name: str = "", member_name: str = "", trainer_name: str = "") -> dict:
    return {
        "id": str(a.id), "member_id": str(a.member_id), "plan_id": str(a.plan_id),
        "trainer_id": str(a.trainer_id) if a.trainer_id else None,
        "started_date": a.started_date.isoformat() if a.started_date else None,
        "ended_date": a.ended_date.isoformat() if a.ended_date else None,
        "status": a.status, "notes": a.notes,
        "assigned_at": a.assigned_at.isoformat() if a.assigned_at else None,
        "plan_name": plan_name, "member_name": member_name, "trainer_name": trainer_name,
    }


# ── Plan CRUD ──────────────────────────────────────────────────────────────────

@router.get("")
def list_plans(db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    plans = db.query(WorkoutPlan).filter(
        WorkoutPlan.vendor_id == current_user.vendor_id
    ).order_by(WorkoutPlan.created_at.desc()).all()
    return [_plan_dict(p) for p in plans]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_plan(data: dict = Body(...), db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    name = (data.get("name") or "").strip()
    if not name:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Plan name is required")
    plan = WorkoutPlan(
        id=uuid.uuid4(), vendor_id=current_user.vendor_id, name=name,
        description=data.get("description"), goal_type=data.get("goal_type", "general"),
        level=data.get("level", "beginner"),
        duration_weeks=int(data.get("duration_weeks") or 4),
        sessions_per_week=int(data.get("sessions_per_week") or 3),
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return _plan_dict(plan)


@router.get("/{plan_id}")
def get_plan(plan_id: str, db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    plan = db.query(WorkoutPlan).filter(
        WorkoutPlan.id == plan_id, WorkoutPlan.vendor_id == current_user.vendor_id
    ).first()
    if not plan:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Plan not found")
    return _plan_dict(plan)


@router.patch("/{plan_id}")
def update_plan(plan_id: str, data: dict = Body(...), db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    plan = db.query(WorkoutPlan).filter(
        WorkoutPlan.id == plan_id, WorkoutPlan.vendor_id == current_user.vendor_id
    ).first()
    if not plan:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Plan not found")
    for field in ("name", "description", "goal_type", "level", "duration_weeks", "sessions_per_week", "is_active"):
        if field in data:
            setattr(plan, field, data[field])
    db.commit()
    db.refresh(plan)
    return _plan_dict(plan)


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(plan_id: str, db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    plan = db.query(WorkoutPlan).filter(
        WorkoutPlan.id == plan_id, WorkoutPlan.vendor_id == current_user.vendor_id
    ).first()
    if not plan:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Plan not found")
    db.delete(plan)
    db.commit()


# ── Exercises ──────────────────────────────────────────────────────────────────

@router.post("/{plan_id}/exercises", status_code=status.HTTP_201_CREATED)
def add_exercise(plan_id: str, data: dict = Body(...), db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    plan = db.query(WorkoutPlan).filter(
        WorkoutPlan.id == plan_id, WorkoutPlan.vendor_id == current_user.vendor_id
    ).first()
    if not plan:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Plan not found")
    ex = WorkoutExercise(
        id=uuid.uuid4(), plan_id=plan.id,
        day_number=int(data.get("day_number") or 1),
        exercise_name=(data.get("exercise_name") or "").strip(),
        sets=int(data["sets"]) if data.get("sets") else None,
        reps=data.get("reps"), duration_seconds=data.get("duration_seconds"),
        rest_seconds=int(data.get("rest_seconds") or 60),
        notes=data.get("notes"),
        order_index=int(data.get("order_index") or 0),
    )
    db.add(ex)
    db.commit()
    db.refresh(ex)
    return _exercise_dict(ex)


@router.delete("/{plan_id}/exercises/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exercise(plan_id: str, exercise_id: str, db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    plan = db.query(WorkoutPlan).filter(
        WorkoutPlan.id == plan_id, WorkoutPlan.vendor_id == current_user.vendor_id
    ).first()
    if not plan:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Plan not found")
    ex = db.query(WorkoutExercise).filter(WorkoutExercise.id == exercise_id, WorkoutExercise.plan_id == plan_id).first()
    if not ex:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Exercise not found")
    db.delete(ex)
    db.commit()


# ── Assignments ────────────────────────────────────────────────────────────────

@router.get("/assignments/all")
def list_assignments(db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    assignments = db.query(MemberWorkoutPlan).filter(
        MemberWorkoutPlan.vendor_id == current_user.vendor_id
    ).order_by(MemberWorkoutPlan.assigned_at.desc()).all()

    plan_map = {str(p.id): p.name for p in db.query(WorkoutPlan).filter(WorkoutPlan.vendor_id == current_user.vendor_id).all()}
    from app.models import Member as MemberModel
    member_map = {str(m.id): f"{m.first_name} {m.last_name}" for m in db.query(MemberModel).filter(MemberModel.vendor_id == current_user.vendor_id).all()}
    trainer_map = {str(u.id): f"{u.first_name} {u.last_name}" for u in db.query(User).filter(User.vendor_id == current_user.vendor_id).all()}

    return [_assignment_dict(
        a,
        plan_map.get(str(a.plan_id), ""),
        member_map.get(str(a.member_id), ""),
        trainer_map.get(str(a.trainer_id), "") if a.trainer_id else "",
    ) for a in assignments]


@router.post("/assignments", status_code=status.HTTP_201_CREATED)
def assign_plan(data: dict = Body(...), db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    member = db.query(Member).filter(Member.id == data.get("member_id"), Member.vendor_id == current_user.vendor_id).first()
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    plan = db.query(WorkoutPlan).filter(WorkoutPlan.id == data.get("plan_id"), WorkoutPlan.vendor_id == current_user.vendor_id).first()
    if not plan:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Plan not found")

    # Deactivate any existing active assignment for this member
    db.query(MemberWorkoutPlan).filter(
        MemberWorkoutPlan.member_id == member.id,
        MemberWorkoutPlan.vendor_id == current_user.vendor_id,
        MemberWorkoutPlan.status == "active",
    ).update({"status": "paused"})

    a = MemberWorkoutPlan(
        id=uuid.uuid4(), vendor_id=current_user.vendor_id,
        member_id=member.id, plan_id=plan.id,
        trainer_id=data.get("trainer_id"),
        notes=data.get("notes"), status="active",
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return _assignment_dict(a, plan.name, f"{member.first_name} {member.last_name}")


@router.patch("/assignments/{assignment_id}")
def update_assignment(assignment_id: str, data: dict = Body(...), db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    a = db.query(MemberWorkoutPlan).filter(
        MemberWorkoutPlan.id == assignment_id, MemberWorkoutPlan.vendor_id == current_user.vendor_id
    ).first()
    if not a:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assignment not found")
    for field in ("status", "notes", "ended_date"):
        if field in data:
            setattr(a, field, data[field])
    db.commit()
    db.refresh(a)
    return _assignment_dict(a)
