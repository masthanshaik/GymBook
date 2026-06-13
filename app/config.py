from pydantic_settings import BaseSettings
from typing import List
import os
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings and configuration"""
    
    # Application
    APP_NAME: str = "GymBook"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", False) == "True"
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://user:password@localhost:5432/gymbook_db"
    )
    SQLALCHEMY_ECHO: bool = DEBUG
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    REDIS_CACHE_EXPIRATION: int = 3600  # 1 hour
    
    # JWT Configuration
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "your-secret-key-change-in-production-min-32-chars-long!!!"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "https://www.gymtrack.io",
        "https://dashboard.gymtrack.io",
        "https://developers.gymtrack.io",
        "https://admin.gymtrack.io",
    ]
    
    # Razorpay Integration
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "")
    
    # WhatsApp Business API
    WHATSAPP_BUSINESS_ACCOUNT_ID: str = os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID", "")
    WHATSAPP_PHONE_NUMBER_ID: str = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
    WHATSAPP_API_TOKEN: str = os.getenv("WHATSAPP_API_TOKEN", "")
    
    # Email Configuration (SendGrid)
    SENDGRID_API_KEY: str = os.getenv("SENDGRID_API_KEY", "")
    FROM_EMAIL: str = os.getenv("FROM_EMAIL", "noreply@gymtrack.io")
    
    # SMS Configuration (Twilio)
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER: str = os.getenv("TWILIO_PHONE_NUMBER", "")
    
    # AWS S3
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_S3_BUCKET: str = os.getenv("AWS_S3_BUCKET", "gymtrack-uploads")
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    
    # Celery Configuration
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/1")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")
    
    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60  # seconds
    
    # API Configuration
    API_KEY_LENGTH: int = 32
    API_CALL_TIMEOUT: int = 30  # seconds
    
    # Multi-tenancy
    ENABLE_MULTI_TENANCY: bool = True
    VENDOR_ISOLATION_LEVEL: str = "row_level_security"  # or "separate_database"
    
    # Email Templates
    EMAIL_TEMPLATE_DIR: str = "templates/emails"
    
    # Frontend URLs (for email links, etc.)
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "https://www.gymtrack.io")
    VENDOR_DASHBOARD_URL: str = os.getenv("VENDOR_DASHBOARD_URL", "https://dashboard.gymtrack.io")
    MEMBER_PORTAL_URL: str = os.getenv("MEMBER_PORTAL_URL", "https://member.gymtrack.io")
    
    # File Upload Configuration
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10 MB
    ALLOWED_FILE_TYPES: List[str] = ["image/jpeg", "image/png", "application/pdf"]
    
    # Feature Flags
    ENABLE_BIOMETRIC: bool = False
    ENABLE_RFID: bool = False
    ENABLE_WHITE_LABELING: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


settings = get_settings()
