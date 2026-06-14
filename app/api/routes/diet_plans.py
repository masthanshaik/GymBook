from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
import uuid

from app.database import get_db
from app.models import DietPlan, DietPlanMeal, MemberDietPlan, Member, User
from app.security import get_current_user, TokenData

router = APIRouter()


def _meal_dict(m: DietPlanMeal) -> dict:
    return {
        "id": str(m.id), "plan_id": str(m.plan_id), "meal_name": m.meal_name,
        "food_items": m.food_items or [], "calories": m.calories,
        "protein": m.protein, "carbs": m.carbs, "fat": m.fat,
        "timing": m.timing, "notes": m.notes,
    }


def _plan_dict(p: DietPlan, include_meals=True) -> dict:
    d = {
        "id": str(p.id), "vendor_id": str(p.vendor_id), "name": p.name,
        "description": p.description, "goal_type": p.goal_type,
        "daily_calories": p.daily_calories, "protein_grams": p.protein_grams,
        "carbs_grams": p.carbs_grams, "fat_grams": p.fat_grams,
        "is_active": p.is_active, "created_at": p.created_at.isoformat() if p.created_at else None,
    }
    if include_meals:
        d["meals"] = [_meal_dict(m) for m in p.meals]
    return d


def _assignment_dict(a: MemberDietPlan, plan_name="", member_name="", trainer_name="") -> dict:
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
    plans = db.query(DietPlan).filter(
        DietPlan.vendor_id == current_user.vendor_id
    ).order_by(DietPlan.created_at.desc()).all()
    return [_plan_dict(p) for p in plans]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_plan(data: dict = Body(...), db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    name = (data.get("name") or "").strip()
    if not name:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Plan name is required")
    plan = DietPlan(
        id=uuid.uuid4(), vendor_id=current_user.vendor_id, name=name,
        description=data.get("description"), goal_type=data.get("goal_type", "general"),
        daily_calories=int(data["daily_calories"]) if data.get("daily_calories") else None,
        protein_grams=float(data["protein_grams"]) if data.get("protein_grams") else None,
        carbs_grams=float(data["carbs_grams"]) if data.get("carbs_grams") else None,
        fat_grams=float(data["fat_grams"]) if data.get("fat_grams") else None,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return _plan_dict(plan)


@router.get("/{plan_id}")
def get_plan(plan_id: str, db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    plan = db.query(DietPlan).filter(DietPlan.id == plan_id, DietPlan.vendor_id == current_user.vendor_id).first()
    if not plan:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Plan not found")
    return _plan_dict(plan)


@router.patch("/{plan_id}")
def update_plan(plan_id: str, data: dict = Body(...), db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    plan = db.query(DietPlan).filter(DietPlan.id == plan_id, DietPlan.vendor_id == current_user.vendor_id).first()
    if not plan:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Plan not found")
    for field in ("name", "description", "goal_type", "daily_calories", "protein_grams", "carbs_grams", "fat_grams", "is_active"):
        if field in data:
            setattr(plan, field, data[field])
    db.commit()
    db.refresh(plan)
    return _plan_dict(plan)


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(plan_id: str, db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    plan = db.query(DietPlan).filter(DietPlan.id == plan_id, DietPlan.vendor_id == current_user.vendor_id).first()
    if not plan:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Plan not found")
    db.delete(plan)
    db.commit()


# ── Meals ──────────────────────────────────────────────────────────────────────

@router.post("/{plan_id}/meals", status_code=status.HTTP_201_CREATED)
def add_meal(plan_id: str, data: dict = Body(...), db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    plan = db.query(DietPlan).filter(DietPlan.id == plan_id, DietPlan.vendor_id == current_user.vendor_id).first()
    if not plan:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Plan not found")
    meal = DietPlanMeal(
        id=uuid.uuid4(), plan_id=plan.id,
        meal_name=(data.get("meal_name") or "Meal").strip(),
        food_items=data.get("food_items", []),
        calories=int(data["calories"]) if data.get("calories") else None,
        protein=float(data["protein"]) if data.get("protein") else None,
        carbs=float(data["carbs"]) if data.get("carbs") else None,
        fat=float(data["fat"]) if data.get("fat") else None,
        timing=data.get("timing"), notes=data.get("notes"),
    )
    db.add(meal)
    db.commit()
    db.refresh(meal)
    return _meal_dict(meal)


@router.delete("/{plan_id}/meals/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal(plan_id: str, meal_id: str, db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    plan = db.query(DietPlan).filter(DietPlan.id == plan_id, DietPlan.vendor_id == current_user.vendor_id).first()
    if not plan:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Plan not found")
    meal = db.query(DietPlanMeal).filter(DietPlanMeal.id == meal_id, DietPlanMeal.plan_id == plan_id).first()
    if not meal:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Meal not found")
    db.delete(meal)
    db.commit()


# ── Assignments ────────────────────────────────────────────────────────────────

@router.get("/assignments/all")
def list_assignments(db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    assignments = db.query(MemberDietPlan).filter(
        MemberDietPlan.vendor_id == current_user.vendor_id
    ).order_by(MemberDietPlan.assigned_at.desc()).all()

    plan_map = {str(p.id): p.name for p in db.query(DietPlan).filter(DietPlan.vendor_id == current_user.vendor_id).all()}
    from app.models import Member as MemberModel
    member_map = {str(m.id): f"{m.first_name} {m.last_name}" for m in db.query(MemberModel).filter(MemberModel.vendor_id == current_user.vendor_id).all()}
    trainer_map = {str(u.id): f"{u.first_name} {u.last_name}" for u in db.query(User).filter(User.vendor_id == current_user.vendor_id).all()}

    return [_assignment_dict(
        a, plan_map.get(str(a.plan_id), ""),
        member_map.get(str(a.member_id), ""),
        trainer_map.get(str(a.trainer_id), "") if a.trainer_id else "",
    ) for a in assignments]


@router.post("/assignments", status_code=status.HTTP_201_CREATED)
def assign_plan(data: dict = Body(...), db: Session = Depends(get_db), current_user: TokenData = Depends(get_current_user)):
    member = db.query(Member).filter(Member.id == data.get("member_id"), Member.vendor_id == current_user.vendor_id).first()
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    plan = db.query(DietPlan).filter(DietPlan.id == data.get("plan_id"), DietPlan.vendor_id == current_user.vendor_id).first()
    if not plan:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Diet plan not found")

    db.query(MemberDietPlan).filter(
        MemberDietPlan.member_id == member.id,
        MemberDietPlan.vendor_id == current_user.vendor_id,
        MemberDietPlan.status == "active",
    ).update({"status": "paused"})

    a = MemberDietPlan(
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
    a = db.query(MemberDietPlan).filter(
        MemberDietPlan.id == assignment_id, MemberDietPlan.vendor_id == current_user.vendor_id
    ).first()
    if not a:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assignment not found")
    for field in ("status", "notes", "ended_date"):
        if field in data:
            setattr(a, field, data[field])
    db.commit()
    db.refresh(a)
    return _assignment_dict(a)
