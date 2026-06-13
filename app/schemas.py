from pydantic import BaseModel, EmailStr, Field, ConfigDict, model_validator
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from enum import Enum


# ===================== AUTHENTICATION SCHEMAS =====================

class LoginRequest(BaseModel):
    """Login request payload"""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    
    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    """Token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    
    model_config = ConfigDict(from_attributes=True)


class RefreshTokenRequest(BaseModel):
    """Refresh token request"""
    refresh_token: str


# ===================== VENDOR SCHEMAS =====================

class VendorCreate(BaseModel):
    """Create vendor request"""
    vendor_name: str = Field(..., min_length=3, max_length=255)
    subdomain: str = Field(..., min_length=3, max_length=100, pattern="^[a-z0-9-]+$")
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=20)
    
    owner_name: str
    owner_email: EmailStr
    owner_password: str = Field(..., min_length=8)
    
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    estimated_members: int = 0
    
    @model_validator(mode='after')
    def validate_subdomain(self):
        """Validate subdomain format"""
        if self.subdomain != self.subdomain.lower():
            raise ValueError("Subdomain must be lowercase")
        return self


class VendorUpdate(BaseModel):
    """Update vendor request"""
    vendor_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    timezone: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None


class VendorResponse(BaseModel):
    """Vendor response"""
    id: UUID
    vendor_name: str
    subdomain: str
    email: str
    phone: str
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    postal_code: Optional[str]
    owner_name: Optional[str]
    estimated_members: int
    current_members: int
    subscription_plan: str
    status: str
    timezone: str
    currency: str
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ===================== MEMBER SCHEMAS =====================

class MemberCreate(BaseModel):
    """Create member request"""
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=20)
    first_name: str = Field(..., min_length=2, max_length=100)
    last_name: Optional[str] = None
    
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    
    communication_preference: Optional[str] = "whatsapp"
    photo: Optional[str] = None  # base64 data URL from webcam capture


class MemberUpdate(BaseModel):
    """Update member request"""
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    communication_preference: Optional[str] = None
    photo: Optional[str] = None


class MemberResponse(BaseModel):
    """Member response"""
    id: UUID
    email: str
    phone: str
    first_name: str
    last_name: Optional[str]
    status: str
    joined_date: datetime
    communication_preference: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class MemberListResponse(BaseModel):
    """Member list response with pagination"""
    total: int
    page: int
    page_size: int
    items: List[MemberResponse]


# ===================== MEMBERSHIP SCHEMAS =====================

class MembershipPlanCreate(BaseModel):
    """Create membership plan request"""
    name: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    duration_months: int = Field(..., ge=1)
    price: float = Field(..., gt=0)
    
    class_limit_per_week: Optional[int] = None
    trainer_access: bool = False
    facility_access: Optional[List[str]] = None
    
    is_trial_plan: bool = False
    trial_duration_days: Optional[int] = None


class MembershipPlanUpdate(BaseModel):
    """Update membership plan request"""
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    class_limit_per_week: Optional[int] = None
    trainer_access: Optional[bool] = None
    facility_access: Optional[List[str]] = None
    is_active: Optional[bool] = None


class MembershipPlanResponse(BaseModel):
    """Membership plan response"""
    id: UUID
    name: str
    description: Optional[str]
    duration_months: int
    price: float
    class_limit_per_week: Optional[int]
    trainer_access: bool
    facility_access: Optional[List[str]]
    is_active: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class MembershipCreate(BaseModel):
    """Create membership request"""
    member_id: UUID
    plan_id: UUID
    original_price: float
    discount_applied: Optional[float] = 0
    started_date: Optional[datetime] = None  # defaults to now if not given
    ended_date: Optional[datetime] = None     # defaults to start + plan duration


class MembershipResponse(BaseModel):
    """Membership response"""
    id: UUID
    member_id: UUID
    plan_id: UUID
    status: str
    started_date: datetime
    ended_date: datetime
    original_price: float
    discount_applied: float
    final_price: float
    is_auto_renew: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ===================== PAYMENT SCHEMAS =====================

class PaymentInitiate(BaseModel):
    """Initiate payment request"""
    member_id: UUID
    amount: float = Field(..., gt=0)
    payment_method: str
    description: Optional[str] = None
    purpose: str  # membership_renewal, new_membership


class PaymentResponse(BaseModel):
    """Payment response"""
    id: UUID
    member_id: UUID
    amount: float
    currency: str
    payment_method: str
    status: str
    razorpay_order_id: Optional[str]
    initiated_at: datetime
    completed_at: Optional[datetime]
    
    model_config = ConfigDict(from_attributes=True)


class RazorpayWebhookPayload(BaseModel):
    """Razorpay webhook payload"""
    event: str
    payload: Dict[str, Any]


# ===================== CLASS SCHEMAS =====================

class ClassCreate(BaseModel):
    """Create class request"""
    name: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    class_type: str
    capacity: int = Field(..., ge=1)
    level: Optional[str] = "beginner"
    trainer_id: Optional[UUID] = None


class ClassUpdate(BaseModel):
    """Update class request"""
    name: Optional[str] = None
    description: Optional[str] = None
    class_type: Optional[str] = None
    capacity: Optional[int] = None
    level: Optional[str] = None
    is_active: Optional[bool] = None


class ClassScheduleCreate(BaseModel):
    """Create class schedule request"""
    day_of_week: str
    start_time: str = Field(..., pattern=r"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    end_time: str = Field(..., pattern=r"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    location: Optional[str] = None


class ClassResponse(BaseModel):
    """Class response"""
    id: UUID
    name: str
    description: Optional[str]
    class_type: str
    capacity: int
    current_enrollment: int
    level: str
    is_active: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ===================== ATTENDANCE SCHEMAS =====================

class AttendanceCheckIn(BaseModel):
    """Check-in request"""
    member_id: UUID
    class_id: Optional[UUID] = None
    check_in_method: str = "manual"  # card, qr, rfid, biometric, manual
    device_id: Optional[str] = None


class AttendanceCheckOut(BaseModel):
    """Check-out request"""
    member_id: UUID
    class_id: Optional[UUID] = None


class AttendanceResponse(BaseModel):
    """Attendance response"""
    id: UUID
    member_id: UUID
    class_id: Optional[UUID]
    check_in_time: datetime
    check_out_time: Optional[datetime]
    status: str
    duration_minutes: Optional[int]
    
    model_config = ConfigDict(from_attributes=True)


# ===================== REPORTS SCHEMAS =====================

class DateRangeFilter(BaseModel):
    """Date range filter"""
    start_date: datetime
    end_date: datetime


class FinancialReport(BaseModel):
    """Financial report"""
    total_revenue: float
    total_refunds: float
    net_revenue: float
    payment_methods: Dict[str, float]
    transactions_count: int
    average_transaction: float
    period: str


class MemberReport(BaseModel):
    """Member report"""
    total_members: int
    active_members: int
    inactive_members: int
    expired_members: int
    new_members_this_month: int
    churn_rate: float
    retention_rate: float


class AttendanceReport(BaseModel):
    """Attendance report"""
    total_check_ins: int
    average_daily_attendance: float
    attendance_rate: float
    peak_hours: List[Dict[str, Any]]
    most_popular_classes: List[Dict[str, Any]]


# ===================== API KEY SCHEMAS =====================

class APIKeyCreate(BaseModel):
    """Create API key request"""
    name: str = Field(..., min_length=3, max_length=255)
    permissions: Optional[List[str]] = None
    expires_at: Optional[datetime] = None


class APIKeyResponse(BaseModel):
    """API key response"""
    id: UUID
    name: str
    key: str  # Only shown once on creation
    permissions: List[str]
    is_active: bool
    created_at: datetime
    expires_at: Optional[datetime]
    
    model_config = ConfigDict(from_attributes=True)


class APIKeyListResponse(BaseModel):
    """API key list response (key hidden)"""
    id: UUID
    name: str
    permissions: List[str]
    is_active: bool
    last_used_at: Optional[datetime]
    created_at: datetime
    expires_at: Optional[datetime]
    
    model_config = ConfigDict(from_attributes=True)


# ===================== WEBHOOK SCHEMAS =====================

class WebhookCreate(BaseModel):
    """Create webhook request"""
    url: str
    events: List[str]
    secret_key: Optional[str] = None


class WebhookUpdate(BaseModel):
    """Update webhook request"""
    url: Optional[str] = None
    events: Optional[List[str]] = None
    is_active: Optional[bool] = None


class WebhookResponse(BaseModel):
    """Webhook response"""
    id: UUID
    url: str
    events: List[str]
    is_active: bool
    last_triggered_at: Optional[datetime]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ===================== ERROR SCHEMAS =====================

class ErrorResponse(BaseModel):
    """Standard error response"""
    error: str
    detail: str
    status_code: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ValidationError(BaseModel):
    """Validation error response"""
    error: str = "Validation Error"
    detail: str
    fields: Optional[Dict[str, str]] = None
    status_code: int = 422


# ===================== PAGINATION =====================

class PaginationParams(BaseModel):
    """Pagination parameters"""
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    
    @property
    def skip(self) -> int:
        return (self.page - 1) * self.page_size
    
    @property
    def limit(self) -> int:
        return self.page_size


# ===================== BULK OPERATIONS =====================

class BulkMemberAction(BaseModel):
    """Bulk member action"""
    member_ids: List[UUID]
    action: str  # send_message, apply_discount, bulk_renewal
    action_data: Dict[str, Any]


class BulkActionResponse(BaseModel):
    """Bulk action response"""
    success_count: int
    failed_count: int
    total: int
    errors: Optional[List[Dict[str, Any]]] = None
