from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Optional
import uuid
import logging

from app.database import get_db
from app.models import Expense, ExpenseCategory, Payment, PaymentStatus
from app.security import get_current_user, TokenData

logger = logging.getLogger(__name__)
router = APIRouter()


def _serialize(e: Expense) -> dict:
    return {
        "id": str(e.id),
        "title": e.title,
        "amount": e.amount,
        "category": e.category.value if hasattr(e.category, "value") else e.category,
        "description": e.description,
        "expense_date": e.expense_date,
        "paid_by": e.paid_by,
        "receipt_url": e.receipt_url,
        "created_at": e.created_at,
    }


@router.get("/")
async def list_expenses(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    days: int = Query(30, ge=1, le=365),
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=days)
    query = db.query(Expense).filter(
        Expense.vendor_id == current_user.vendor_id,
        Expense.expense_date >= since,
    )
    if category:
        query = query.filter(Expense.category == category)

    total = query.count()
    items = (
        query.order_by(Expense.expense_date.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {"total": total, "page": page, "page_size": page_size, "items": [_serialize(e) for e in items]}


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_expense(
    data: dict,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not data.get("title") or not data.get("amount"):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "title and amount are required")

    expense = Expense(
        id=uuid.uuid4(),
        vendor_id=current_user.vendor_id,
        title=data["title"].strip(),
        amount=float(data["amount"]),
        category=data.get("category", ExpenseCategory.OTHER),
        description=data.get("description"),
        expense_date=data.get("expense_date") or datetime.utcnow(),
        paid_by=data.get("paid_by"),
        receipt_url=data.get("receipt_url"),
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return _serialize(expense)


@router.put("/{expense_id}")
async def update_expense(
    expense_id: str,
    data: dict,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.vendor_id == current_user.vendor_id,
    ).first()
    if not expense:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Expense not found")

    for field, value in data.items():
        if hasattr(expense, field) and field not in ("id", "vendor_id"):
            setattr(expense, field, value)

    db.commit()
    db.refresh(expense)
    return _serialize(expense)


@router.delete("/{expense_id}")
async def delete_expense(
    expense_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.vendor_id == current_user.vendor_id,
    ).first()
    if not expense:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Expense not found")

    db.delete(expense)
    db.commit()
    return {"message": "Expense deleted", "id": expense_id}


@router.get("/summary")
async def expense_summary(
    days: int = Query(30, ge=1, le=365),
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    vid = current_user.vendor_id
    since = datetime.utcnow() - timedelta(days=days)

    total_expenses = db.query(func.coalesce(func.sum(Expense.amount), 0.0)).filter(
        Expense.vendor_id == vid,
        Expense.expense_date >= since,
    ).scalar() or 0.0

    total_revenue = db.query(func.coalesce(func.sum(Payment.amount), 0.0)).filter(
        Payment.vendor_id == vid,
        Payment.status == PaymentStatus.COMPLETED,
        Payment.completed_at >= since,
    ).scalar() or 0.0

    by_category = {}
    for cat in ExpenseCategory:
        amt = db.query(func.coalesce(func.sum(Expense.amount), 0.0)).filter(
            Expense.vendor_id == vid,
            Expense.category == cat,
            Expense.expense_date >= since,
        ).scalar() or 0.0
        if amt > 0:
            by_category[cat.value] = round(float(amt), 2)

    return {
        "total_expenses": round(float(total_expenses), 2),
        "total_revenue": round(float(total_revenue), 2),
        "net_profit": round(float(total_revenue) - float(total_expenses), 2),
        "by_category": by_category,
        "period_days": days,
    }
