from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.database import get_db
from app.models import Coupon, DiscountType
from app.security import get_current_user, TokenData

router = APIRouter()


def _coupon_dict(c: Coupon) -> dict:
    return {
        "id": str(c.id),
        "code": c.code,
        "description": c.description,
        "discount_type": c.discount_type.value if c.discount_type else None,
        "discount_value": c.discount_value,
        "min_purchase_amount": c.min_purchase_amount,
        "max_uses": c.max_uses,
        "used_count": c.used_count,
        "valid_from": c.valid_from.isoformat() if c.valid_from else None,
        "valid_till": c.valid_till.isoformat() if c.valid_till else None,
        "is_active": c.is_active,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


@router.get("")
def list_coupons(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    coupons = db.query(Coupon).filter(
        Coupon.vendor_id == current_user.vendor_id
    ).order_by(Coupon.created_at.desc()).all()
    return [_coupon_dict(c) for c in coupons]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_coupon(
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    code = (data.get("code") or "").strip().upper()
    if not code:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Coupon code is required")

    existing = db.query(Coupon).filter(
        Coupon.vendor_id == current_user.vendor_id,
        Coupon.code == code,
    ).first()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Coupon code already exists")

    discount_value = float(data.get("discount_value") or 0)
    if discount_value <= 0:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Discount value must be positive")

    discount_type_raw = data.get("discount_type", "percentage")
    try:
        discount_type = DiscountType(discount_type_raw)
    except ValueError:
        discount_type = DiscountType.PERCENTAGE

    if discount_type == DiscountType.PERCENTAGE and discount_value > 100:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Percentage discount cannot exceed 100")

    valid_till = None
    if data.get("valid_till"):
        try:
            valid_till = datetime.fromisoformat(data["valid_till"].replace("Z", "+00:00"))
        except Exception:
            pass

    coupon = Coupon(
        id=uuid.uuid4(),
        vendor_id=current_user.vendor_id,
        code=code,
        description=data.get("description"),
        discount_type=discount_type,
        discount_value=discount_value,
        min_purchase_amount=float(data.get("min_purchase_amount") or 0),
        max_uses=int(data["max_uses"]) if data.get("max_uses") else None,
        valid_till=valid_till,
        is_active=True,
    )
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return _coupon_dict(coupon)


@router.post("/validate")
def validate_coupon(
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    code = (data.get("code") or "").strip().upper()
    amount = float(data.get("amount") or 0)

    coupon = db.query(Coupon).filter(
        Coupon.vendor_id == current_user.vendor_id,
        Coupon.code == code,
        Coupon.is_active == True,
    ).first()

    if not coupon:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invalid or inactive coupon code")

    now = datetime.utcnow()
    if coupon.valid_till and coupon.valid_till < now:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Coupon has expired")

    if coupon.max_uses and coupon.used_count >= coupon.max_uses:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Coupon usage limit reached")

    if amount < coupon.min_purchase_amount:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Minimum purchase amount of {coupon.min_purchase_amount} required"
        )

    if coupon.discount_type == DiscountType.PERCENTAGE:
        discount_amount = round(amount * coupon.discount_value / 100, 2)
    else:
        discount_amount = min(coupon.discount_value, amount)

    return {
        "valid": True,
        "coupon": _coupon_dict(coupon),
        "discount_amount": discount_amount,
        "final_amount": round(amount - discount_amount, 2),
    }


@router.patch("/{coupon_id}")
def update_coupon(
    coupon_id: str,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    coupon = db.query(Coupon).filter(
        Coupon.id == coupon_id,
        Coupon.vendor_id == current_user.vendor_id,
    ).first()
    if not coupon:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Coupon not found")

    if "description" in data:
        coupon.description = data["description"]
    if "is_active" in data:
        coupon.is_active = bool(data["is_active"])
    if "max_uses" in data:
        coupon.max_uses = int(data["max_uses"]) if data["max_uses"] else None
    if "valid_till" in data and data["valid_till"]:
        try:
            coupon.valid_till = datetime.fromisoformat(data["valid_till"].replace("Z", "+00:00"))
        except Exception:
            pass

    db.commit()
    db.refresh(coupon)
    return _coupon_dict(coupon)


@router.delete("/{coupon_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_coupon(
    coupon_id: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    coupon = db.query(Coupon).filter(
        Coupon.id == coupon_id,
        Coupon.vendor_id == current_user.vendor_id,
    ).first()
    if not coupon:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Coupon not found")
    db.delete(coupon)
    db.commit()
