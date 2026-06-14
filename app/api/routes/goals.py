from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.database import get_db
from app.models import FitnessGoal, GoalType, GoalStatus, Member
from app.security import get_current_user, TokenData

router = APIRouter()


def _goal_dict(g: FitnessGoal) -> dict:
    return {
        "id": str(g.id),
        "member_id": str(g.member_id),
        "goal_type": g.goal_type.value if g.goal_type else None,
        "title": g.title,
        "description": g.description,
        "target_value": g.target_value,
        "target_unit": g.target_unit,
        "current_value": g.current_value,
        "deadline": g.deadline.isoformat() if g.deadline else None,
        "status": g.status.value if g.status else None,
        "notes": g.notes,
        "created_at": g.created_at.isoformat() if g.created_at else None,
        "updated_at": g.updated_at.isoformat() if g.updated_at else None,
    }


@router.get("")
def list_goals(
    member_id: str = None,
    goal_status: str = None,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    q = db.query(FitnessGoal).filter(FitnessGoal.vendor_id == current_user.vendor_id)
    if member_id:
        q = q.filter(FitnessGoal.member_id == member_id)
    if goal_status:
        try:
            q = q.filter(FitnessGoal.status == GoalStatus(goal_status))
        except ValueError:
            pass
    goals = q.order_by(FitnessGoal.created_at.desc()).all()
    return [_goal_dict(g) for g in goals]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_goal(
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    member_id = data.get("member_id")
    if not member_id:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "member_id is required")

    member = db.query(Member).filter(
        Member.id == member_id,
        Member.vendor_id == current_user.vendor_id,
        Member.deleted_at.is_(None),
    ).first()
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")

    title = (data.get("title") or "").strip()
    if not title:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Goal title is required")

    try:
        goal_type = GoalType(data.get("goal_type", "custom"))
    except ValueError:
        goal_type = GoalType.CUSTOM

    deadline = None
    if data.get("deadline"):
        try:
            deadline = datetime.fromisoformat(data["deadline"].replace("Z", "+00:00"))
        except Exception:
            pass

    goal = FitnessGoal(
        id=uuid.uuid4(),
        vendor_id=current_user.vendor_id,
        member_id=member_id,
        goal_type=goal_type,
        title=title,
        description=data.get("description"),
        target_value=float(data["target_value"]) if data.get("target_value") else None,
        target_unit=data.get("target_unit"),
        current_value=float(data["current_value"]) if data.get("current_value") else None,
        deadline=deadline,
        notes=data.get("notes"),
        status=GoalStatus.ACTIVE,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return _goal_dict(goal)


@router.patch("/{goal_id}")
def update_goal(
    goal_id: str,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    goal = db.query(FitnessGoal).filter(
        FitnessGoal.id == goal_id,
        FitnessGoal.vendor_id == current_user.vendor_id,
    ).first()
    if not goal:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Goal not found")

    if "current_value" in data and data["current_value"] is not None:
        goal.current_value = float(data["current_value"])
    if "status" in data:
        try:
            goal.status = GoalStatus(data["status"])
        except ValueError:
            pass
    if "notes" in data:
        goal.notes = data["notes"]
    if "title" in data:
        goal.title = data["title"]
    if "description" in data:
        goal.description = data["description"]
    if "deadline" in data and data["deadline"]:
        try:
            goal.deadline = datetime.fromisoformat(data["deadline"].replace("Z", "+00:00"))
        except Exception:
            pass

    db.commit()
    db.refresh(goal)
    return _goal_dict(goal)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    goal = db.query(FitnessGoal).filter(
        FitnessGoal.id == goal_id,
        FitnessGoal.vendor_id == current_user.vendor_id,
    ).first()
    if not goal:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Goal not found")
    db.delete(goal)
    db.commit()
