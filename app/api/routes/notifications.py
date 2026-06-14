"""
Notification route — triggers WhatsApp / SMS messages to members.
Gracefully degrades: if Twilio/WhatsApp keys are absent it logs instead of erroring.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import logging
import uuid

from app.database import get_db
from app.models import Member, Membership, MembershipStatus, SMSLog, WhatsAppLog
from app.security import get_current_user, TokenData
from app.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


def _send_whatsapp(phone: str, message: str, vendor_id) -> bool:
    """Send via WhatsApp Business API. Returns True on success."""
    if not settings.WHATSAPP_API_TOKEN or not settings.WHATSAPP_PHONE_NUMBER_ID:
        logger.info(f"[WhatsApp MOCK] To {phone}: {message}")
        return True  # treat as success in dev
    try:
        import httpx
        url = f"https://graph.facebook.com/v18.0/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
        payload = {
            "messaging_product": "whatsapp",
            "to": phone,
            "type": "text",
            "text": {"body": message},
        }
        r = httpx.post(url, json=payload, headers={"Authorization": f"Bearer {settings.WHATSAPP_API_TOKEN}"}, timeout=10)
        return r.status_code == 200
    except Exception as e:
        logger.error(f"WhatsApp send error: {e}")
        return False


def _send_sms(phone: str, message: str) -> bool:
    """Send via Twilio. Returns True on success."""
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        logger.info(f"[SMS MOCK] To {phone}: {message}")
        return True
    try:
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        client.messages.create(body=message, from_=settings.TWILIO_PHONE_NUMBER, to=f"+91{phone}")
        return True
    except Exception as e:
        logger.error(f"SMS send error: {e}")
        return False


def _notify_member(member: Member, message: str, channel: str, db: Session, vendor_id) -> dict:
    """Send to a member via their preferred channel (or the requested channel)."""
    phone = member.phone or ""
    success = False

    if channel in ("whatsapp", "both"):
        success = _send_whatsapp(phone, message, vendor_id)
        db.add(WhatsAppLog(
            id=uuid.uuid4(), vendor_id=vendor_id, member_id=member.id,
            recipient_phone=phone, message_body=message,
            status="sent" if success else "failed",
        ))

    if channel in ("sms", "both"):
        success = _send_sms(phone, message)
        db.add(SMSLog(
            id=uuid.uuid4(), vendor_id=vendor_id, member_id=member.id,
            recipient_phone=phone, message_body=message,
            status="sent" if success else "failed",
        ))

    db.commit()
    return {"member_id": str(member.id), "name": f"{member.first_name} {member.last_name}", "phone": phone, "success": success}


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/renewal-reminder")
def send_renewal_reminders(
    data: dict = Body(default={}),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Send renewal reminders to members whose memberships expire within N days."""
    days = int(data.get("days_before", 7))
    channel = data.get("channel", "whatsapp")
    now = datetime.utcnow()
    cutoff = now + timedelta(days=days)

    expiring = db.query(Membership).filter(
        Membership.vendor_id == current_user.vendor_id,
        Membership.status == MembershipStatus.ACTIVE,
        Membership.ended_date <= cutoff,
        Membership.ended_date >= now,
    ).all()

    if not expiring:
        return {"sent": 0, "message": "No memberships expiring in that window"}

    results = []
    for ms in expiring:
        member = db.query(Member).filter(Member.id == ms.member_id).first()
        if not member or not member.phone:
            continue
        days_left = (ms.ended_date - now).days
        msg = (
            f"Hi {member.first_name}! Your membership at our gym expires in {days_left} day(s) "
            f"(on {ms.ended_date.strftime('%d %b %Y')}). Please renew to continue enjoying our facilities. "
            f"Reply STOP to opt out."
        )
        results.append(_notify_member(member, msg, channel, db, current_user.vendor_id))

    return {"sent": len(results), "results": results}


@router.post("/payment-receipt")
def send_payment_receipt(
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Send a payment receipt notification to a member."""
    member = db.query(Member).filter(
        Member.id == data.get("member_id"), Member.vendor_id == current_user.vendor_id
    ).first()
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")

    amount = data.get("amount", 0)
    channel = data.get("channel", "whatsapp")
    msg = (
        f"Hi {member.first_name}! We've received your payment of ₹{amount:,.0f}. "
        f"Thank you for your continued membership. See you at the gym!"
    )
    result = _notify_member(member, msg, channel, db, current_user.vendor_id)
    return result


@router.post("/birthday-wish")
def send_birthday_wishes(
    data: dict = Body(default={}),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Send birthday wishes to members with birthday today."""
    channel = data.get("channel", "whatsapp")
    today = datetime.utcnow()

    # Fetch all members and filter by birth month/day
    members = db.query(Member).filter(
        Member.vendor_id == current_user.vendor_id,
        Member.deleted_at.is_(None),
    ).all()

    birthday_members = [
        m for m in members
        if m.date_of_birth and m.date_of_birth.month == today.month and m.date_of_birth.day == today.day
    ]

    if not birthday_members:
        return {"sent": 0, "message": "No birthdays today"}

    results = []
    for member in birthday_members:
        msg = (
            f"Happy Birthday, {member.first_name}! 🎂 Wishing you a wonderful day. "
            f"As a birthday gift, show this message at the gym for a special surprise!"
        )
        results.append(_notify_member(member, msg, channel, db, current_user.vendor_id))

    return {"sent": len(results), "results": results}


@router.post("/custom")
def send_custom_notification(
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Send a custom message to one or all members."""
    message = (data.get("message") or "").strip()
    if not message:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Message is required")

    channel = data.get("channel", "whatsapp")
    member_ids = data.get("member_ids")  # None = broadcast to all

    if member_ids:
        members = db.query(Member).filter(
            Member.id.in_(member_ids),
            Member.vendor_id == current_user.vendor_id,
            Member.deleted_at.is_(None),
        ).all()
    else:
        members = db.query(Member).filter(
            Member.vendor_id == current_user.vendor_id,
            Member.deleted_at.is_(None),
        ).all()

    results = []
    for member in members:
        if member.phone:
            results.append(_notify_member(member, message, channel, db, current_user.vendor_id))

    return {"sent": len(results), "results": results}


@router.get("/logs")
def get_notification_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Recent WhatsApp + SMS send logs."""
    wa_logs = db.query(WhatsAppLog).filter(
        WhatsAppLog.vendor_id == current_user.vendor_id
    ).order_by(WhatsAppLog.created_at.desc()).limit(limit // 2).all()

    sms_logs = db.query(SMSLog).filter(
        SMSLog.vendor_id == current_user.vendor_id
    ).order_by(SMSLog.created_at.desc()).limit(limit // 2).all()

    def _wa(l):
        return {"type": "whatsapp", "id": str(l.id), "phone": l.recipient_phone,
                "message": l.message_body, "status": l.status,
                "sent_at": l.created_at.isoformat() if l.created_at else None}

    def _sms(l):
        return {"type": "sms", "id": str(l.id), "phone": l.recipient_phone,
                "message": l.message_body, "status": l.status,
                "sent_at": l.created_at.isoformat() if l.created_at else None}

    logs = sorted([_wa(l) for l in wa_logs] + [_sms(l) for l in sms_logs],
                  key=lambda x: x["sent_at"] or "", reverse=True)
    return logs
