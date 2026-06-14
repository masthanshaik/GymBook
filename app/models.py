from sqlalchemy import (
    Column, String, Integer, Float, DateTime, Boolean, 
    Text, ForeignKey, Enum, Index, UniqueConstraint,
    JSON, LargeBinary
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime, timedelta
import uuid
import enum

from app.database import Base


# ===================== ENUM CLASSES =====================

class VendorStatus(str, enum.Enum):
    TRIAL = "trial"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"


class SubscriptionPlan(str, enum.Enum):
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class MembershipStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    EXPIRED = "expired"
    SUSPENDED = "suspended"
    TRIAL = "trial"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"


class PaymentMethod(str, enum.Enum):
    RAZORPAY = "razorpay"
    UPI = "upi"
    CARD = "card"
    WALLET = "wallet"
    CASH = "cash"


class UserRole(str, enum.Enum):
    PLATFORM_ADMIN = "platform_admin"
    SUPPORT_TEAM = "support_team"
    FINANCE_TEAM = "finance_team"
    GYM_OWNER = "gym_owner"
    GYM_MANAGER = "gym_manager"
    FRONT_DESK = "front_desk"
    TRAINER = "trainer"
    MEMBER = "member"
    API_CONSUMER = "api_consumer"


class AttendanceStatus(str, enum.Enum):
    CHECKED_IN = "checked_in"
    CHECKED_OUT = "checked_out"
    NO_SHOW = "no_show"
    CANCELLED = "cancelled"


class WebhookEventType(str, enum.Enum):
    MEMBER_CREATED = "member.created"
    MEMBER_UPDATED = "member.updated"
    MEMBER_DELETED = "member.deleted"
    MEMBERSHIP_RENEWED = "membership.renewed"
    MEMBERSHIP_EXPIRED = "membership.expired"
    MEMBERSHIP_CANCELLED = "membership.cancelled"
    PAYMENT_COMPLETED = "payment.completed"
    PAYMENT_FAILED = "payment.failed"
    PAYMENT_REFUNDED = "payment.refunded"
    ATTENDANCE_CHECKED_IN = "attendance.checked_in"
    ATTENDANCE_CHECKED_OUT = "attendance.checked_out"


# ===================== CORE VENDOR MODELS =====================

class Vendor(Base):
    """Gym/Fitness center vendor account"""
    __tablename__ = "vendors"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_name = Column(String(255), nullable=False)
    subdomain = Column(String(100), nullable=False, unique=True, index=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    phone = Column(String(20))
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100), default="India")
    postal_code = Column(String(10))
    
    # Vendor details
    owner_name = Column(String(255))
    owner_email = Column(String(255))
    estimated_members = Column(Integer, default=0)
    current_members = Column(Integer, default=0)
    
    # Subscription
    subscription_plan = Column(Enum(SubscriptionPlan), default=SubscriptionPlan.STARTER)
    status = Column(Enum(VendorStatus), default=VendorStatus.TRIAL)
    trial_ends_at = Column(DateTime, default=lambda: datetime.utcnow() + timedelta(days=14))
    
    # Settings
    timezone = Column(String(50), default="Asia/Kolkata")
    currency = Column(String(3), default="INR")
    language = Column(String(10), default="en")
    
    # Branding
    logo_url = Column(String(500))
    primary_color = Column(String(7), default="#007AFF")
    secondary_color = Column(String(7), default="#34C759")
    
    # Metadata
    settings = Column(JSONB, default={})
    extra_metadata = Column("metadata", JSONB, default={})
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)
    
    # Relationships
    subscriptions = relationship("VendorSubscription", back_populates="vendor", cascade="all, delete-orphan")
    settings_rel = relationship("VendorSettings", back_populates="vendor", uselist=False, cascade="all, delete-orphan")
    members = relationship("Member", back_populates="vendor", cascade="all, delete-orphan")
    membership_plans = relationship("MembershipPlan", back_populates="vendor", cascade="all, delete-orphan")
    staff = relationship("User", back_populates="vendor", cascade="all, delete-orphan")
    classes = relationship("Class", back_populates="vendor", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="vendor", cascade="all, delete-orphan")
    api_keys = relationship("APIKey", back_populates="vendor", cascade="all, delete-orphan")
    webhooks = relationship("Webhook", back_populates="vendor", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_vendor_subdomain', 'subdomain'),
        Index('idx_vendor_status', 'status'),
        Index('idx_vendor_created_at', 'created_at'),
    )


class VendorSubscription(Base):
    """Vendor subscription tracking"""
    __tablename__ = "vendor_subscriptions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendors.id'), nullable=False, index=True)
    plan = Column(Enum(SubscriptionPlan), nullable=False)
    price = Column(Float, nullable=False)
    billing_cycle = Column(String(10))  # monthly, annual
    
    razorpay_subscription_id = Column(String(100), unique=True)
    razorpay_plan_id = Column(String(100))
    
    started_at = Column(DateTime, default=datetime.utcnow)
    next_billing_date = Column(DateTime)
    ended_at = Column(DateTime, nullable=True)
    
    is_active = Column(Boolean, default=True, index=True)
    auto_renew = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    vendor = relationship("Vendor", back_populates="subscriptions")


class VendorSettings(Base):
    """Vendor-specific configuration"""
    __tablename__ = "vendor_settings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendors.id'), nullable=False, unique=True, index=True)
    
    # Working hours
    opening_time = Column(String(10))
    closing_time = Column(String(10))
    
    # Payment settings
    razorpay_key_id = Column(String(100))
    razorpay_key_secret = Column(String(100))
    
    # Communication settings
    whatsapp_enabled = Column(Boolean, default=False)
    whatsapp_business_account_id = Column(String(100))
    whatsapp_phone_number_id = Column(String(100))
    whatsapp_api_token = Column(String(500))
    
    email_enabled = Column(Boolean, default=True)
    sms_enabled = Column(Boolean, default=False)
    
    # Policies
    renewal_reminder_days = Column(Integer, default=7)
    cancellation_policy_days = Column(Integer, default=30)
    
    # Features
    enable_online_payment = Column(Boolean, default=True)
    enable_membership_plans = Column(Boolean, default=True)
    enable_class_booking = Column(Boolean, default=True)
    enable_attendance_tracking = Column(Boolean, default=True)
    enable_api_access = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    vendor = relationship("Vendor", back_populates="settings_rel")


# ===================== USER MODELS =====================

class User(Base):
    """Staff and admin users"""
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendors.id'), nullable=True, index=True)
    
    email = Column(String(255), nullable=False, unique=True, index=True)
    phone = Column(String(20))
    password_hash = Column(String(255), nullable=False)
    
    first_name = Column(String(100))
    last_name = Column(String(100))
    
    role = Column(Enum(UserRole), default=UserRole.GYM_MANAGER)
    is_active = Column(Boolean, default=True, index=True)
    
    # OAuth/Social login
    oauth_provider = Column(String(50))  # google, apple, etc.
    oauth_id = Column(String(255))
    
    # MFA
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String(255))
    
    last_login = Column(DateTime)
    last_login_ip = Column(String(45))
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)
    
    vendor = relationship("Vendor", back_populates="staff")
    activity_logs = relationship("ActivityLog", back_populates="user", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_user_vendor_id', 'vendor_id'),
        Index('idx_user_email', 'email'),
    )


# ===================== MEMBER MODELS =====================

class Member(Base):
    """Gym members"""
    __tablename__ = "members"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendors.id'), nullable=False, index=True)
    
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(20), nullable=False)
    password_hash = Column(String(255))  # For self-service portal
    
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100))
    
    date_of_birth = Column(DateTime)
    gender = Column(String(20))
    
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    postal_code = Column(String(10))
    
    emergency_contact_name = Column(String(100))
    emergency_contact_phone = Column(String(20))
    
    # Membership info
    status = Column(Enum(MembershipStatus), default=MembershipStatus.TRIAL, index=True)
    joined_date = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Preferences
    communication_preference = Column(String(50), default="whatsapp")  # whatsapp, sms, email
    
    # Admin notes
    notes = Column(Text)
    
    # Metadata
    extra_metadata = Column("metadata", JSONB, default={})
    
    # Soft delete
    deleted_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    vendor = relationship("Vendor", back_populates="members")
    memberships = relationship("Membership", back_populates="member", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="member", cascade="all, delete-orphan")
    attendance = relationship("Attendance", back_populates="member", cascade="all, delete-orphan")
    class_enrollments = relationship("ClassMember", back_populates="member", cascade="all, delete-orphan")
    feedback = relationship("MemberFeedback", back_populates="member", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_member_vendor_id_email', 'vendor_id', 'email'),
        Index('idx_member_status', 'status'),
        Index('idx_member_joined_date', 'joined_date'),
        UniqueConstraint('vendor_id', 'email', name='uq_vendor_member_email'),
    )


class Membership(Base):
    """Member-Plan association and tracking"""
    __tablename__ = "memberships"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendors.id'), nullable=False, index=True)
    member_id = Column(UUID(as_uuid=True), ForeignKey('members.id'), nullable=False, index=True)
    plan_id = Column(UUID(as_uuid=True), ForeignKey('membership_plans.id'), nullable=False, index=True)
    
    status = Column(Enum(MembershipStatus), default=MembershipStatus.ACTIVE, index=True)
    
    started_date = Column(DateTime, nullable=False, index=True)
    ended_date = Column(DateTime, nullable=False, index=True)
    
    # Pricing
    original_price = Column(Float, nullable=False)
    discount_applied = Column(Float, default=0)
    final_price = Column(Float, nullable=False)
    
    # Payment
    payment_id = Column(UUID(as_uuid=True), ForeignKey('payments.id'))
    
    is_auto_renew = Column(Boolean, default=True)
    
    # Freezing
    is_frozen = Column(Boolean, default=False)
    frozen_from = Column(DateTime)
    frozen_till = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    member = relationship("Member", back_populates="memberships")
    plan = relationship("MembershipPlan", back_populates="memberships")
    payment = relationship("Payment", foreign_keys=[payment_id])
    
    __table_args__ = (
        Index('idx_membership_vendor_member', 'vendor_id', 'member_id'),
        Index('idx_membership_ended_date', 'ended_date'),
    )


class MembershipPlan(Base):
    """Gym membership plans"""
    __tablename__ = "membership_plans"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendors.id'), nullable=False, index=True)
    
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    duration_months = Column(Integer, nullable=False)  # 1, 3, 6, 12
    price = Column(Float, nullable=False)
    
    # Features
    class_limit_per_week = Column(Integer)
    trainer_access = Column(Boolean, default=False)
    facility_access = Column(JSONB, default=list)  # gym, pool, sauna, etc.
    
    is_active = Column(Boolean, default=True, index=True)
    
    # Trial option
    is_trial_plan = Column(Boolean, default=False)
    trial_duration_days = Column(Integer)
    
    # Metadata
    extra_metadata = Column("metadata", JSONB, default={})
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    vendor = relationship("Vendor", back_populates="membership_plans")
    memberships = relationship("Membership", back_populates="plan", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_plan_vendor_id', 'vendor_id'),
        Index('idx_plan_is_active', 'is_active'),
    )


# ===================== PAYMENT MODELS =====================

class Payment(Base):
    """Payment transactions"""
    __tablename__ = "payments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendors.id'), nullable=False, index=True)
    member_id = Column(UUID(as_uuid=True), ForeignKey('members.id'), nullable=False, index=True)
    
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="INR")
    
    payment_method = Column(Enum(PaymentMethod), nullable=False)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING, index=True)
    
    # Razorpay details
    razorpay_payment_id = Column(String(100), unique=True)
    razorpay_order_id = Column(String(100))
    razorpay_signature = Column(String(500))
    
    # UPI details
    upi_id = Column(String(100))
    upi_ref_id = Column(String(100))
    
    # Payment description
    description = Column(String(500))
    purpose = Column(String(100))  # membership_renewal, new_membership, etc.
    
    # Timestamps
    initiated_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    
    # Refund info
    is_refunded = Column(Boolean, default=False)
    refund_amount = Column(Float)
    refund_date = Column(DateTime)
    refund_reason = Column(String(255))
    
    # Metadata
    extra_metadata = Column("metadata", JSONB, default={})
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    vendor = relationship("Vendor", back_populates="payments")
    member = relationship("Member", back_populates="payments")
    
    __table_args__ = (
        Index('idx_payment_vendor_member', 'vendor_id', 'member_id'),
        Index('idx_payment_status', 'status'),
        Index('idx_payment_completed_at', 'completed_at'),
    )


class Invoice(Base):
    """Invoice documents"""
    __tablename__ = "invoices"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendors.id'), nullable=False)
    payment_id = Column(UUID(as_uuid=True), ForeignKey('payments.id'), nullable=False)
    member_id = Column(UUID(as_uuid=True), ForeignKey('members.id'), nullable=False)
    
    invoice_number = Column(String(50), unique=True, nullable=False)
    amount = Column(Float, nullable=False)
    
    issued_date = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime)
    
    pdf_url = Column(String(500))
    
    created_at = Column(DateTime, default=datetime.utcnow)


# ===================== CLASS MODELS =====================

class Class(Base):
    """Gym classes/batches"""
    __tablename__ = "classes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendors.id'), nullable=False, index=True)
    trainer_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    class_type = Column(String(100))  # yoga, crossfit, zumba, etc.
    capacity = Column(Integer, nullable=False)
    current_enrollment = Column(Integer, default=0)
    
    level = Column(String(50))  # beginner, intermediate, advanced
    
    is_active = Column(Boolean, default=True, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    vendor = relationship("Vendor", back_populates="classes")
    schedules = relationship("ClassSchedule", back_populates="class_ref", cascade="all, delete-orphan")
    members = relationship("ClassMember", back_populates="class_ref", cascade="all, delete-orphan")
    attendance_records = relationship("Attendance", back_populates="class_ref", cascade="all, delete-orphan")


class ClassSchedule(Base):
    """Recurring class schedules"""
    __tablename__ = "class_schedules"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    class_id = Column(UUID(as_uuid=True), ForeignKey('classes.id'), nullable=False, index=True)
    
    day_of_week = Column(String(20), nullable=False)  # Monday, Tuesday, etc.
    start_time = Column(String(10), nullable=False)
    end_time = Column(String(10), nullable=False)
    
    location = Column(String(255))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    class_ref = relationship("Class", back_populates="schedules")


class ClassMember(Base):
    """Member enrollment in classes"""
    __tablename__ = "class_members"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    class_id = Column(UUID(as_uuid=True), ForeignKey('classes.id'), nullable=False, index=True)
    member_id = Column(UUID(as_uuid=True), ForeignKey('members.id'), nullable=False, index=True)
    
    enrolled_date = Column(DateTime, default=datetime.utcnow)
    unenrolled_date = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    class_ref = relationship("Class", back_populates="members")
    member = relationship("Member", back_populates="class_enrollments")


# ===================== ATTENDANCE MODELS =====================

class Attendance(Base):
    """Member attendance records"""
    __tablename__ = "attendance"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendors.id'), nullable=False, index=True)
    member_id = Column(UUID(as_uuid=True), ForeignKey('members.id'), nullable=False, index=True)
    class_id = Column(UUID(as_uuid=True), ForeignKey('classes.id'), nullable=True)
    
    check_in_time = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    check_out_time = Column(DateTime)
    
    status = Column(Enum(AttendanceStatus), default=AttendanceStatus.CHECKED_IN)
    
    check_in_method = Column(String(50))  # card, qr, rfid, biometric, manual
    check_in_device_id = Column(String(100))
    
    # Duration in minutes
    duration_minutes = Column(Integer)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    vendor = relationship("Vendor", foreign_keys=[vendor_id])
    member = relationship("Member", back_populates="attendance")
    class_ref = relationship("Class", back_populates="attendance_records")
    
    __table_args__ = (
        Index('idx_attendance_vendor_member', 'vendor_id', 'member_id'),
        Index('idx_attendance_check_in_time', 'check_in_time'),
    )


# ===================== FEEDBACK MODELS =====================

class MemberFeedback(Base):
    """Member feedback and complaints"""
    __tablename__ = "member_feedback"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendors.id'), nullable=False)
    member_id = Column(UUID(as_uuid=True), ForeignKey('members.id'), nullable=False)
    
    type = Column(String(50))  # complaint, suggestion, feedback
    category = Column(String(100))
    subject = Column(String(255))
    message = Column(Text, nullable=False)
    
    rating = Column(Integer)  # 1-5 stars
    
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime)
    resolution_notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    member = relationship("Member", back_populates="feedback")


# ===================== API & DEVELOPER MODELS =====================

class APIKey(Base):
    """Developer API keys"""
    __tablename__ = "api_keys"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendors.id'), nullable=False, index=True)
    
    name = Column(String(255), nullable=False)
    key = Column(String(64), unique=True, nullable=False, index=True)
    key_hash = Column(String(255), unique=True, nullable=False)
    
    permissions = Column(JSONB, default=list)  # List of scopes
    
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime)
    
    expires_at = Column(DateTime)
    
    rate_limit_requests = Column(Integer, default=1000)
    rate_limit_window = Column(Integer, default=3600)  # seconds
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime)
    
    vendor = relationship("Vendor", back_populates="api_keys")
    usage = relationship("APIUsage", back_populates="api_key", cascade="all, delete-orphan")


class APIUsage(Base):
    """API usage tracking"""
    __tablename__ = "api_usage"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    api_key_id = Column(UUID(as_uuid=True), ForeignKey('api_keys.id'), nullable=False, index=True)
    
    endpoint = Column(String(255))
    method = Column(String(10))
    status_code = Column(Integer)
    response_time_ms = Column(Integer)
    
    request_size = Column(Integer)
    response_size = Column(Integer)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    api_key = relationship("APIKey", back_populates="usage")


class Webhook(Base):
    """Registered webhooks"""
    __tablename__ = "webhooks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendors.id'), nullable=False, index=True)
    
    url = Column(String(500), nullable=False)
    events = Column(JSONB, default=list)
    
    secret_key = Column(String(255))
    
    is_active = Column(Boolean, default=True)
    
    last_triggered_at = Column(DateTime)
    last_error = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    vendor = relationship("Vendor", back_populates="webhooks")
    logs = relationship("WebhookLog", back_populates="webhook", cascade="all, delete-orphan")


class WebhookLog(Base):
    """Webhook delivery logs"""
    __tablename__ = "webhook_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    webhook_id = Column(UUID(as_uuid=True), ForeignKey('webhooks.id'), nullable=False, index=True)
    
    event_type = Column(Enum(WebhookEventType))
    payload = Column(JSONB)
    
    status_code = Column(Integer)
    response = Column(Text)
    error_message = Column(Text)
    
    retry_count = Column(Integer, default=0)
    last_retry_at = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    webhook = relationship("Webhook", back_populates="logs")


# ===================== AUDIT & LOGGING MODELS =====================

class ActivityLog(Base):
    """Activity audit trail"""
    __tablename__ = "activity_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendors.id'), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    
    action = Column(String(255))
    entity_type = Column(String(100))
    entity_id = Column(UUID(as_uuid=True))
    
    old_values = Column(JSONB)
    new_values = Column(JSONB)
    
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    user = relationship("User", back_populates="activity_logs")


class EmailLog(Base):
    """Email delivery logs"""
    __tablename__ = "email_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendors.id'), nullable=False)
    member_id = Column(UUID(as_uuid=True), ForeignKey('members.id'), nullable=True)
    
    recipient_email = Column(String(255))
    subject = Column(String(255))
    
    template_name = Column(String(100))
    
    status = Column(String(50))  # sent, bounced, complained
    
    sendgrid_message_id = Column(String(100))
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SMSLog(Base):
    """SMS delivery logs"""
    __tablename__ = "sms_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendors.id'), nullable=False)
    member_id = Column(UUID(as_uuid=True), ForeignKey('members.id'), nullable=True)
    
    recipient_phone = Column(String(20))
    message_body = Column(Text)
    
    status = Column(String(50))  # sent, delivered, failed
    
    twilio_message_id = Column(String(100))
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class WhatsAppLog(Base):
    """WhatsApp message logs"""
    __tablename__ = "whatsapp_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendors.id'), nullable=False)
    member_id = Column(UUID(as_uuid=True), ForeignKey('members.id'), nullable=True)

    recipient_phone = Column(String(20))
    message_body = Column(Text)
    template_name = Column(String(100))

    status = Column(String(50))  # sent, delivered, read, failed

    whatsapp_message_id = Column(String(100))

    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ===================== PASSWORD RESET =====================

class PasswordResetToken(Base):
    """Password reset tokens"""
    __tablename__ = "password_reset_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    token = Column(String(128), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# ===================== BODY MEASUREMENTS =====================

class BodyMeasurement(Base):
    """Member body measurements and progress tracking"""
    __tablename__ = "body_measurements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendors.id'), nullable=False, index=True)
    member_id = Column(UUID(as_uuid=True), ForeignKey('members.id'), nullable=False, index=True)

    recorded_date = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Weight & body composition
    weight_kg = Column(Float)
    height_cm = Column(Float)
    bmi = Column(Float)
    body_fat_pct = Column(Float)
    muscle_mass_kg = Column(Float)

    # Body measurements (cm)
    chest_cm = Column(Float)
    waist_cm = Column(Float)
    hips_cm = Column(Float)
    left_arm_cm = Column(Float)
    right_arm_cm = Column(Float)
    left_thigh_cm = Column(Float)
    right_thigh_cm = Column(Float)

    notes = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)

    member = relationship("Member", backref="measurements")

    __table_args__ = (
        Index('idx_measurement_member_date', 'member_id', 'recorded_date'),
    )


# ===================== LEAD / CRM =====================

class LeadStatus(str, enum.Enum):
    NEW = "new"
    CONTACTED = "contacted"
    TRIAL = "trial"
    CONVERTED = "converted"
    LOST = "lost"


class Lead(Base):
    """Prospective member enquiries (CRM)"""
    __tablename__ = "leads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendors.id'), nullable=False, index=True)

    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100))
    email = Column(String(255))
    phone = Column(String(20), nullable=False)

    source = Column(String(100))  # walk-in, online, referral, social_media
    interest = Column(String(255))  # weight loss, muscle gain, yoga, etc.

    status = Column(Enum(LeadStatus), default=LeadStatus.NEW, index=True)

    assigned_to = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)

    follow_up_date = Column(DateTime, nullable=True)
    notes = Column(Text)

    converted_member_id = Column(UUID(as_uuid=True), ForeignKey('members.id'), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_lead_vendor_status', 'vendor_id', 'status'),
    )


# ===================== EXPENSE TRACKING =====================

class ExpenseCategory(str, enum.Enum):
    RENT = "rent"
    UTILITIES = "utilities"
    EQUIPMENT = "equipment"
    SALARIES = "salaries"
    MAINTENANCE = "maintenance"
    MARKETING = "marketing"
    SUPPLIES = "supplies"
    OTHER = "other"


class Expense(Base):
    """Gym expense records"""
    __tablename__ = "expenses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendors.id'), nullable=False, index=True)

    title = Column(String(255), nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(Enum(ExpenseCategory), default=ExpenseCategory.OTHER)
    description = Column(Text)

    expense_date = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    paid_by = Column(String(100))
    receipt_url = Column(String(500))

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_expense_vendor_date', 'vendor_id', 'expense_date'),
    )


# ===================== LOCKER MANAGEMENT =====================

class LockerStatus(str, enum.Enum):
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    MAINTENANCE = "maintenance"


class Locker(Base):
    """Gym locker management"""
    __tablename__ = "lockers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendors.id'), nullable=False, index=True)

    locker_number = Column(String(20), nullable=False)
    location = Column(String(100))  # e.g., "Row A", "Male section"

    status = Column(Enum(LockerStatus), default=LockerStatus.AVAILABLE, index=True)

    member_id = Column(UUID(as_uuid=True), ForeignKey('members.id'), nullable=True)
    assigned_date = Column(DateTime, nullable=True)
    expiry_date = Column(DateTime, nullable=True)

    monthly_fee = Column(Float, default=0)
    notes = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    member = relationship("Member", backref="lockers")

    __table_args__ = (
        UniqueConstraint('vendor_id', 'locker_number', name='uq_vendor_locker_number'),
        Index('idx_locker_vendor_status', 'vendor_id', 'status'),
    )


# ===================== CLASS WAITLIST =====================

class ClassWaitlist(Base):
    """Waitlist for full classes"""
    __tablename__ = "class_waitlist"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    class_id = Column(UUID(as_uuid=True), ForeignKey('classes.id'), nullable=False, index=True)
    member_id = Column(UUID(as_uuid=True), ForeignKey('members.id'), nullable=False, index=True)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendors.id'), nullable=False, index=True)

    position = Column(Integer, nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow)
    notified = Column(Boolean, default=False)

    class_ref = relationship("Class", backref="waitlist")
    member = relationship("Member", backref="waitlist_entries")

    __table_args__ = (
        UniqueConstraint('class_id', 'member_id', name='uq_class_waitlist_member'),
    )


# ===================== COUPONS =====================

class DiscountType(str, enum.Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"


class Coupon(Base):
    """Promo codes and discount coupons"""
    __tablename__ = "coupons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendors.id'), nullable=False, index=True)

    code = Column(String(50), nullable=False)
    description = Column(String(255))

    discount_type = Column(Enum(DiscountType), nullable=False, default=DiscountType.PERCENTAGE)
    discount_value = Column(Float, nullable=False)

    min_purchase_amount = Column(Float, default=0)
    max_uses = Column(Integer, nullable=True)
    used_count = Column(Integer, default=0)

    valid_from = Column(DateTime, default=datetime.utcnow)
    valid_till = Column(DateTime, nullable=True)

    is_active = Column(Boolean, default=True, index=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('vendor_id', 'code', name='uq_vendor_coupon_code'),
        Index('idx_coupon_vendor_active', 'vendor_id', 'is_active'),
    )


# ===================== FITNESS GOALS =====================

class GoalType(str, enum.Enum):
    WEIGHT_LOSS = "weight_loss"
    MUSCLE_GAIN = "muscle_gain"
    ENDURANCE = "endurance"
    FLEXIBILITY = "flexibility"
    CUSTOM = "custom"


class GoalStatus(str, enum.Enum):
    ACTIVE = "active"
    ACHIEVED = "achieved"
    ABANDONED = "abandoned"


class FitnessGoal(Base):
    """Member fitness goals and progress tracking"""
    __tablename__ = "fitness_goals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendors.id'), nullable=False, index=True)
    member_id = Column(UUID(as_uuid=True), ForeignKey('members.id'), nullable=False, index=True)

    goal_type = Column(Enum(GoalType), nullable=False, default=GoalType.CUSTOM)
    title = Column(String(255), nullable=False)
    description = Column(Text)

    target_value = Column(Float)
    target_unit = Column(String(50))
    current_value = Column(Float)

    deadline = Column(DateTime, nullable=True)
    status = Column(Enum(GoalStatus), default=GoalStatus.ACTIVE, index=True)

    notes = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    member = relationship("Member", backref="goals")

    __table_args__ = (
        Index('idx_goal_member_status', 'member_id', 'status'),
    )


# ===================== WORKOUT PLANS =====================

class WorkoutPlan(Base):
    """Reusable workout plan templates created by trainers/owners"""
    __tablename__ = "workout_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendors.id'), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    goal_type = Column(String(50))  # weight_loss, muscle_gain, endurance, flexibility, general
    level = Column(String(50), default="beginner")  # beginner, intermediate, advanced
    duration_weeks = Column(Integer, default=4)
    sessions_per_week = Column(Integer, default=3)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    exercises = relationship("WorkoutExercise", backref="plan", cascade="all, delete-orphan", order_by="WorkoutExercise.day_number, WorkoutExercise.order_index")


class WorkoutExercise(Base):
    """Individual exercises within a workout plan"""
    __tablename__ = "workout_exercises"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_id = Column(UUID(as_uuid=True), ForeignKey('workout_plans.id'), nullable=False, index=True)
    day_number = Column(Integer, nullable=False)  # 1–7
    exercise_name = Column(String(255), nullable=False)
    sets = Column(Integer)
    reps = Column(String(50))  # "10–12" or "to failure"
    duration_seconds = Column(Integer)
    rest_seconds = Column(Integer, default=60)
    notes = Column(Text)
    order_index = Column(Integer, default=0)


class MemberWorkoutPlan(Base):
    """Assignment of a workout plan to a specific member"""
    __tablename__ = "member_workout_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendors.id'), nullable=False, index=True)
    member_id = Column(UUID(as_uuid=True), ForeignKey('members.id'), nullable=False, index=True)
    plan_id = Column(UUID(as_uuid=True), ForeignKey('workout_plans.id'), nullable=False)
    trainer_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    started_date = Column(DateTime, default=datetime.utcnow)
    ended_date = Column(DateTime, nullable=True)
    status = Column(String(20), default="active")  # active, completed, paused
    notes = Column(Text)
    assigned_at = Column(DateTime, default=datetime.utcnow)


# ===================== DIET PLANS =====================

class DietPlan(Base):
    """Reusable nutrition/diet plan templates"""
    __tablename__ = "diet_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendors.id'), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    goal_type = Column(String(50))
    daily_calories = Column(Integer)
    protein_grams = Column(Float)
    carbs_grams = Column(Float)
    fat_grams = Column(Float)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    meals = relationship("DietPlanMeal", backref="plan", cascade="all, delete-orphan")


class DietPlanMeal(Base):
    """Individual meals within a diet plan"""
    __tablename__ = "diet_plan_meals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_id = Column(UUID(as_uuid=True), ForeignKey('diet_plans.id'), nullable=False, index=True)
    meal_name = Column(String(100), nullable=False)  # Breakfast, Lunch, Dinner, Snack
    food_items = Column(JSON, default=list)  # [{"name": "Oats", "quantity": "100g"}]
    calories = Column(Integer)
    protein = Column(Float)
    carbs = Column(Float)
    fat = Column(Float)
    timing = Column(String(50))  # "7:00 AM"
    notes = Column(Text)


class MemberDietPlan(Base):
    """Assignment of a diet plan to a specific member"""
    __tablename__ = "member_diet_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendors.id'), nullable=False, index=True)
    member_id = Column(UUID(as_uuid=True), ForeignKey('members.id'), nullable=False, index=True)
    plan_id = Column(UUID(as_uuid=True), ForeignKey('diet_plans.id'), nullable=False)
    trainer_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    started_date = Column(DateTime, default=datetime.utcnow)
    ended_date = Column(DateTime, nullable=True)
    status = Column(String(20), default="active")
    notes = Column(Text)
    assigned_at = Column(DateTime, default=datetime.utcnow)


# ===================== TRAINER ASSIGNMENTS =====================

class TrainerMemberAssignment(Base):
    """Links a personal trainer (User) to a member"""
    __tablename__ = "trainer_member_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendors.id'), nullable=False, index=True)
    trainer_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    member_id = Column(UUID(as_uuid=True), ForeignKey('members.id'), nullable=False)
    assigned_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    monthly_fee = Column(Float, nullable=True)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
