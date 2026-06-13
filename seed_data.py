"""
Seed script — populates the database with realistic mock test data.

Run AFTER the backend has started at least once (so tables exist):
    source venv/bin/activate
    python3 seed_data.py

Creates a demo gym you can log into:
    Email:    demo@gymbook.com
    Password: Demo@1234
"""
import sys
import uuid
import random
from datetime import datetime, timedelta

from app.database import SessionLocal, engine, Base
from app import models
from app.models import (
    Vendor, VendorSettings, User, Member, MembershipPlan, Membership,
    Payment, Class, Attendance, UserRole, MembershipStatus,
    PaymentStatus, PaymentMethod, AttendanceStatus,
)
from app.security import PasswordManager

# Make sure tables exist
Base.metadata.create_all(bind=engine)

db = SessionLocal()

DEMO_EMAIL = "demo@gymbook.com"
DEMO_PASSWORD = "Demo@1234"


def reset_demo():
    """Remove any existing demo vendor so the script is re-runnable."""
    existing = db.query(Vendor).filter(Vendor.subdomain == "demogym").first()
    if not existing:
        return
    vid = existing.id
    db.query(Attendance).filter(Attendance.vendor_id == vid).delete()
    db.query(Payment).filter(Payment.vendor_id == vid).delete()
    db.query(Membership).filter(Membership.vendor_id == vid).delete()
    db.query(Class).filter(Class.vendor_id == vid).delete()
    db.query(MembershipPlan).filter(MembershipPlan.vendor_id == vid).delete()
    db.query(Member).filter(Member.vendor_id == vid).delete()
    db.query(User).filter(User.vendor_id == vid).delete()
    db.query(VendorSettings).filter(VendorSettings.vendor_id == vid).delete()
    db.query(Vendor).filter(Vendor.id == vid).delete()
    db.commit()
    print("• Cleared previous demo data")


def run():
    reset_demo()
    now = datetime.utcnow()

    # ---- Vendor + owner ----
    vendor = Vendor(
        id=uuid.uuid4(), vendor_name="Paradise Fitness", subdomain="demogym",
        email="contact@paradisefitness.com", phone="9676600520",
        address="12 MG Road", city="Hyderabad", state="Telangana", postal_code="500001",
        owner_name="Demo Owner", owner_email=DEMO_EMAIL,
        current_members=0, estimated_members=100,
        subscription_plan="professional", status="active", timezone="Asia/Kolkata", currency="INR",
    )
    db.add(vendor); db.flush()

    db.add(VendorSettings(id=uuid.uuid4(), vendor_id=vendor.id))

    owner = User(
        id=uuid.uuid4(), vendor_id=vendor.id, email=DEMO_EMAIL,
        password_hash=PasswordManager.hash_password(DEMO_PASSWORD),
        first_name="Demo", last_name="Owner", role=UserRole.GYM_OWNER, is_active=True,
    )
    db.add(owner); db.flush()
    print(f"• Created gym 'Paradise Fitness' + owner login")

    # ---- Plans ----
    plans = []
    for name, months, price in [
        ("Monthly", 1, 1500), ("Quarterly", 3, 4000),
        ("Half-Yearly", 6, 7500), ("Annual", 12, 13000),
    ]:
        p = MembershipPlan(
            id=uuid.uuid4(), vendor_id=vendor.id, name=name,
            description=f"{name} membership", duration_months=months,
            price=price, is_active=True, facility_access=[],
        )
        db.add(p); plans.append(p)
    db.flush()
    print(f"• Created {len(plans)} membership plans")

    # ---- Members ----
    first_names = ["Aarav", "Diya", "Vihaan", "Ananya", "Arjun", "Saanvi", "Reyansh",
                   "Ishita", "Kabir", "Myra", "Vivaan", "Aadhya", "Krishna", "Pari", "Rohan"]
    last_names = ["Sharma", "Reddy", "Patel", "Nair", "Khan", "Singh", "Rao", "Gupta"]
    cities = ["Hyderabad", "Bangalore", "Chennai", "Mumbai", "Pune"]

    members = []
    for i in range(15):
        fn = first_names[i]
        ln = random.choice(last_names)
        m = Member(
            id=uuid.uuid4(), vendor_id=vendor.id,
            email=f"{fn.lower()}.{ln.lower()}{i}@example.com",
            phone=f"9{random.randint(100000000, 999999999)}",
            first_name=fn, last_name=ln,
            gender=random.choice(["male", "female"]),
            city=random.choice(cities),
            status=MembershipStatus.ACTIVE,
            joined_date=now - timedelta(days=random.randint(5, 300)),
            communication_preference="whatsapp",
            extra_metadata={},
        )
        db.add(m); members.append(m)
    db.flush()
    vendor.current_members = len(members)
    print(f"• Created {len(members)} members")

    # ---- Memberships with varied expiry (drives renewals view) ----
    # 3 expired, 3 expiring soon (within 7 days), rest healthy
    statuses_plan = (
        [("expired", -10), ("expired", -5), ("expired", -2)] +
        [("soon", 2), ("soon", 4), ("soon", 6)] +
        [("healthy", random.randint(30, 200)) for _ in range(9)]
    )
    for member, (_, days_offset) in zip(members, statuses_plan):
        plan = random.choice(plans)
        ended = now + timedelta(days=days_offset)
        started = ended - timedelta(days=30 * plan.duration_months)
        ms = Membership(
            id=uuid.uuid4(), vendor_id=vendor.id, member_id=member.id, plan_id=plan.id,
            status=MembershipStatus.EXPIRED if days_offset < 0 else MembershipStatus.ACTIVE,
            started_date=started, ended_date=ended,
            original_price=plan.price, discount_applied=0, final_price=plan.price,
        )
        db.add(ms)
    db.flush()
    print("• Assigned memberships (3 expired, 3 expiring soon, 9 active)")

    # ---- Payments across last 6 months (drives revenue chart) ----
    pay_count = 0
    for member in members:
        for _ in range(random.randint(1, 4)):
            plan = random.choice(plans)
            when = now - timedelta(days=random.randint(0, 175))
            db.add(Payment(
                id=uuid.uuid4(), vendor_id=vendor.id, member_id=member.id,
                amount=float(plan.price), currency="INR",
                payment_method=random.choice([PaymentMethod.CASH, PaymentMethod.UPI]),
                status=PaymentStatus.COMPLETED,
                purpose="new_membership", initiated_at=when, completed_at=when,
            ))
            pay_count += 1
    db.flush()
    print(f"• Created {pay_count} completed payments (last 6 months)")

    # ---- Classes ----
    class_defs = [("Morning Yoga", "yoga", 20), ("CrossFit Blast", "crossfit", 15),
                  ("Zumba Party", "zumba", 25), ("Strength 101", "strength", 12)]
    for nm, ct, cap in class_defs:
        db.add(Class(
            id=uuid.uuid4(), vendor_id=vendor.id, name=nm, class_type=ct,
            capacity=cap, current_enrollment=random.randint(0, cap), level="beginner", is_active=True,
        ))
    db.flush()
    print(f"• Created {len(class_defs)} classes")

    # ---- Attendance (today + last 30 days) ----
    att = 0
    for _ in range(40):
        member = random.choice(members)
        cin = now - timedelta(days=random.randint(0, 29), hours=random.randint(0, 5))
        cout = cin + timedelta(minutes=random.randint(40, 120))
        db.add(Attendance(
            id=uuid.uuid4(), vendor_id=vendor.id, member_id=member.id,
            check_in_time=cin, check_out_time=cout, status=AttendanceStatus.CHECKED_OUT,
            duration_minutes=int((cout - cin).total_seconds() // 60), check_in_method="manual",
        ))
        att += 1
    # a few checked-in-now
    for member in random.sample(members, 3):
        db.add(Attendance(
            id=uuid.uuid4(), vendor_id=vendor.id, member_id=member.id,
            check_in_time=now - timedelta(minutes=random.randint(10, 90)),
            status=AttendanceStatus.CHECKED_IN, check_in_method="manual",
        ))
        att += 1
    db.flush()
    print(f"• Created {att} attendance records")

    db.commit()
    print("\n" + "=" * 50)
    print("✅ Seed complete! Log in with:")
    print(f"   Email:    {DEMO_EMAIL}")
    print(f"   Password: {DEMO_PASSWORD}")
    print("=" * 50)


if __name__ == "__main__":
    try:
        run()
    except Exception as e:
        db.rollback()
        print(f"❌ Seed failed: {e}")
        raise
    finally:
        db.close()
