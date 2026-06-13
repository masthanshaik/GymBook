from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
import uuid
import logging

from app.database import get_db
from app.models import BodyMeasurement, Member
from app.security import get_current_user, TokenData

logger = logging.getLogger(__name__)
router = APIRouter()


def _serialize(m: BodyMeasurement) -> dict:
    return {
        "id": str(m.id),
        "member_id": str(m.member_id),
        "recorded_date": m.recorded_date,
        "weight_kg": m.weight_kg,
        "height_cm": m.height_cm,
        "bmi": m.bmi,
        "body_fat_pct": m.body_fat_pct,
        "muscle_mass_kg": m.muscle_mass_kg,
        "chest_cm": m.chest_cm,
        "waist_cm": m.waist_cm,
        "hips_cm": m.hips_cm,
        "left_arm_cm": m.left_arm_cm,
        "right_arm_cm": m.right_arm_cm,
        "left_thigh_cm": m.left_thigh_cm,
        "right_thigh_cm": m.right_thigh_cm,
        "notes": m.notes,
        "created_at": m.created_at,
    }


@router.get("/member/{member_id}")
async def get_member_measurements(
    member_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    member = db.query(Member).filter(
        Member.id == member_id,
        Member.vendor_id == current_user.vendor_id,
        Member.deleted_at.is_(None),
    ).first()
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")

    records = (
        db.query(BodyMeasurement)
        .filter(BodyMeasurement.member_id == member_id)
        .order_by(BodyMeasurement.recorded_date.desc())
        .all()
    )
    return [_serialize(r) for r in records]


@router.post("/member/{member_id}", status_code=status.HTTP_201_CREATED)
async def add_measurement(
    member_id: str,
    data: dict,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    member = db.query(Member).filter(
        Member.id == member_id,
        Member.vendor_id == current_user.vendor_id,
        Member.deleted_at.is_(None),
    ).first()
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")

    weight = data.get("weight_kg")
    height = data.get("height_cm")
    bmi = None
    if weight and height:
        weight = float(weight)
        height = float(height)
        if height > 0:
            bmi = round(weight / ((height / 100) ** 2), 1)

    record = BodyMeasurement(
        id=uuid.uuid4(),
        vendor_id=current_user.vendor_id,
        member_id=member_id,
        recorded_date=data.get("recorded_date") or datetime.utcnow(),
        weight_kg=weight,
        height_cm=height,
        bmi=bmi,
        body_fat_pct=data.get("body_fat_pct"),
        muscle_mass_kg=data.get("muscle_mass_kg"),
        chest_cm=data.get("chest_cm"),
        waist_cm=data.get("waist_cm"),
        hips_cm=data.get("hips_cm"),
        left_arm_cm=data.get("left_arm_cm"),
        right_arm_cm=data.get("right_arm_cm"),
        left_thigh_cm=data.get("left_thigh_cm"),
        right_thigh_cm=data.get("right_thigh_cm"),
        notes=data.get("notes"),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _serialize(record)


@router.put("/{measurement_id}")
async def update_measurement(
    measurement_id: str,
    data: dict,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = db.query(BodyMeasurement).filter(
        BodyMeasurement.id == measurement_id,
        BodyMeasurement.vendor_id == current_user.vendor_id,
    ).first()
    if not record:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Measurement not found")

    for field, value in data.items():
        if hasattr(record, field) and field not in ("id", "vendor_id", "member_id"):
            setattr(record, field, value)

    weight = record.weight_kg
    height = record.height_cm
    if weight and height and height > 0:
        record.bmi = round(weight / ((height / 100) ** 2), 1)

    db.commit()
    db.refresh(record)
    return _serialize(record)


@router.delete("/{measurement_id}")
async def delete_measurement(
    measurement_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = db.query(BodyMeasurement).filter(
        BodyMeasurement.id == measurement_id,
        BodyMeasurement.vendor_id == current_user.vendor_id,
    ).first()
    if not record:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Measurement not found")

    db.delete(record)
    db.commit()
    return {"message": "Measurement deleted", "id": measurement_id}
