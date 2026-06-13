from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
import uuid
import secrets
import hashlib
import logging

from app.database import get_db
from app.models import APIKey, APIUsage, Webhook
from app.security import get_current_user, TokenData

logger = logging.getLogger(__name__)
router = APIRouter()


def _serialize_key(k: APIKey, show_key: bool = False) -> dict:
    return {
        "id": str(k.id),
        "name": k.name,
        "key": k.key if show_key else f"{k.key[:8]}...{k.key[-4:]}",
        "permissions": k.permissions or [],
        "is_active": k.is_active,
        "last_used_at": k.last_used_at,
        "expires_at": k.expires_at,
        "created_at": k.created_at,
    }


def _serialize_webhook(w: Webhook) -> dict:
    return {
        "id": str(w.id),
        "url": w.url,
        "events": w.events or [],
        "is_active": w.is_active,
        "last_triggered_at": w.last_triggered_at,
        "last_error": w.last_error,
        "created_at": w.created_at,
    }


@router.get("/api-keys")
async def list_api_keys(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    keys = db.query(APIKey).filter(
        APIKey.vendor_id == current_user.vendor_id,
        APIKey.deleted_at.is_(None),
    ).order_by(APIKey.created_at.desc()).all()
    return [_serialize_key(k) for k in keys]


@router.post("/api-keys", status_code=status.HTTP_201_CREATED)
async def create_api_key(
    data: dict,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    name = (data.get("name") or "").strip()
    if not name:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "name is required")

    raw_key = secrets.token_urlsafe(32)
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

    api_key = APIKey(
        id=uuid.uuid4(),
        vendor_id=current_user.vendor_id,
        name=name,
        key=raw_key,
        key_hash=key_hash,
        permissions=data.get("permissions", []),
        expires_at=data.get("expires_at"),
        rate_limit_requests=data.get("rate_limit_requests", 1000),
        is_active=True,
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    return _serialize_key(api_key, show_key=True)


@router.delete("/api-keys/{key_id}")
async def delete_api_key(
    key_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    key = db.query(APIKey).filter(
        APIKey.id == key_id,
        APIKey.vendor_id == current_user.vendor_id,
    ).first()
    if not key:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "API key not found")
    key.deleted_at = datetime.utcnow()
    key.is_active = False
    db.commit()
    return {"message": "API key revoked", "id": key_id}


@router.get("/webhooks")
async def list_webhooks(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    webhooks = db.query(Webhook).filter(
        Webhook.vendor_id == current_user.vendor_id,
    ).order_by(Webhook.created_at.desc()).all()
    return [_serialize_webhook(w) for w in webhooks]


@router.post("/webhooks", status_code=status.HTTP_201_CREATED)
async def create_webhook(
    data: dict,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    url = (data.get("url") or "").strip()
    events = data.get("events", [])
    if not url:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "url is required")
    if not events:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "at least one event is required")

    webhook = Webhook(
        id=uuid.uuid4(),
        vendor_id=current_user.vendor_id,
        url=url,
        events=events,
        secret_key=data.get("secret_key") or secrets.token_urlsafe(16),
        is_active=True,
    )
    db.add(webhook)
    db.commit()
    db.refresh(webhook)
    return _serialize_webhook(webhook)


@router.put("/webhooks/{webhook_id}")
async def update_webhook(
    webhook_id: str,
    data: dict,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    webhook = db.query(Webhook).filter(
        Webhook.id == webhook_id,
        Webhook.vendor_id == current_user.vendor_id,
    ).first()
    if not webhook:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Webhook not found")

    for field in ("url", "events", "is_active"):
        if field in data:
            setattr(webhook, field, data[field])
    db.commit()
    db.refresh(webhook)
    return _serialize_webhook(webhook)


@router.delete("/webhooks/{webhook_id}")
async def delete_webhook(
    webhook_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    webhook = db.query(Webhook).filter(
        Webhook.id == webhook_id,
        Webhook.vendor_id == current_user.vendor_id,
    ).first()
    if not webhook:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Webhook not found")
    db.delete(webhook)
    db.commit()
    return {"message": "Webhook deleted", "id": webhook_id}


@router.get("/usage")
async def api_usage(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    keys = db.query(APIKey).filter(
        APIKey.vendor_id == current_user.vendor_id,
    ).all()
    key_ids = [k.id for k in keys]
    total_calls = 0
    if key_ids:
        total_calls = db.query(func.count(APIUsage.id)).filter(
            APIUsage.api_key_id.in_(key_ids)
        ).scalar() or 0
    return {
        "total_api_keys": len(keys),
        "active_keys": sum(1 for k in keys if k.is_active),
        "total_calls": total_calls,
    }
