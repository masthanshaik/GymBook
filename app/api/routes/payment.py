from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime
import uuid
import logging

from app.database import get_db
from app.models import Payment, Member, PaymentStatus, PaymentMethod
from app.schemas import PaymentInitiate
from app.security import get_current_user, TokenData
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


def _payment(p: Payment) -> dict:
    return {
        "id": str(p.id),
        "member_id": str(p.member_id),
        "amount": p.amount,
        "currency": p.currency,
        "payment_method": p.payment_method.value if hasattr(p.payment_method, "value") else p.payment_method,
        "status": p.status.value if hasattr(p.status, "value") else p.status,
        "razorpay_order_id": p.razorpay_order_id,
        "description": p.description,
        "purpose": p.purpose,
        "initiated_at": p.initiated_at,
        "completed_at": p.completed_at,
    }


@router.post("/initiate", status_code=status.HTTP_201_CREATED)
async def initiate_payment(
    request: PaymentInitiate,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Initiate a payment. Uses Razorpay if keys are configured, else records
    a manual/cash payment immediately as completed."""
    member = db.query(Member).filter(
        Member.id == request.member_id,
        Member.vendor_id == current_user.vendor_id,
    ).first()
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")

    razorpay_order_id = None
    pay_status = PaymentStatus.PENDING
    method = PaymentMethod.RAZORPAY

    # Try Razorpay only if configured
    if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
        try:
            import razorpay
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            order = client.order.create({
                "amount": int(request.amount * 100),  # paise
                "currency": "INR",
                "receipt": f"rcpt_{uuid.uuid4().hex[:12]}",
            })
            razorpay_order_id = order.get("id")
        except Exception as e:
            logger.warning(f"Razorpay order failed, recording as pending: {e}")
    else:
        # No gateway configured -> treat as manual/cash, mark completed
        method = PaymentMethod.CASH if request.payment_method == "cash" else PaymentMethod.UPI
        pay_status = PaymentStatus.COMPLETED

    try:
        payment = Payment(
            id=uuid.uuid4(),
            vendor_id=current_user.vendor_id,
            member_id=member.id,
            amount=request.amount,
            currency="INR",
            payment_method=method,
            status=pay_status,
            razorpay_order_id=razorpay_order_id,
            description=request.description,
            purpose=request.purpose,
            initiated_at=datetime.utcnow(),
            completed_at=datetime.utcnow() if pay_status == PaymentStatus.COMPLETED else None,
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)
        logger.info(f"Payment initiated: {payment.id} status={pay_status}")
        return _payment(payment)
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating payment: {e}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not initiate payment")


@router.post("/{payment_id}/confirm")
async def confirm_payment(
    payment_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a pending payment as completed (used after gateway callback)"""
    p = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.vendor_id == current_user.vendor_id,
    ).first()
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment not found")
    p.status = PaymentStatus.COMPLETED
    p.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(p)
    return _payment(p)


@router.get("/{payment_id}")
async def get_payment(
    payment_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get payment details"""
    p = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.vendor_id == current_user.vendor_id,
    ).first()
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment not found")
    return _payment(p)


@router.post("/{payment_id}/refund")
async def refund_payment(
    payment_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Refund a completed payment"""
    p = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.vendor_id == current_user.vendor_id,
    ).first()
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payment not found")
    if p.status != PaymentStatus.COMPLETED:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only completed payments can be refunded")
    p.status = PaymentStatus.REFUNDED
    p.is_refunded = True
    p.refund_amount = p.amount
    p.refund_date = datetime.utcnow()
    db.commit()
    return {"message": "Payment refunded", "id": str(p.id)}


@router.get("/history/{member_id}")
async def payment_history(
    member_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a member's payment history"""
    payments = db.query(Payment).filter(
        Payment.member_id == member_id,
        Payment.vendor_id == current_user.vendor_id,
    ).order_by(Payment.initiated_at.desc()).all()
    return {"items": [_payment(p) for p in payments], "total": len(payments)}


@router.post("/webhook/razorpay")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    """Razorpay webhook receiver — marks the matching order completed."""
    try:
        body = await request.json()
    except Exception:
        body = {}
    try:
        entity = body.get("payload", {}).get("payment", {}).get("entity", {})
        order_id = entity.get("order_id")
        if order_id:
            p = db.query(Payment).filter(Payment.razorpay_order_id == order_id).first()
            if p:
                p.status = PaymentStatus.COMPLETED
                p.completed_at = datetime.utcnow()
                p.razorpay_payment_id = entity.get("id")
                db.commit()
    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
    return {"status": "ok"}
