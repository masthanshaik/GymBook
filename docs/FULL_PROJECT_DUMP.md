# 📁 FULL PROJECT DUMP - GYM MANAGEMENT PLATFORM

## PROJECT STRUCTURE

```
gym_management_platform/
│
├── Backend (FastAPI)
│   ├── main.py                          ← Entry point
│   ├── requirements.txt                 ← Dependencies
│   ├── Dockerfile                       ← Docker configuration
│   ├── docker-compose.yml               ← Docker compose
│   │
│   └── app/
│       ├── __init__.py
│       ├── config.py                    ← Settings/configuration
│       ├── database.py                  ← Database connection
│       ├── models.py                    ← SQLAlchemy models
│       ├── schemas.py                   ← Pydantic schemas
│       ├── security.py                  ← JWT, password, auth
│       │
│       └── api/
│           ├── __init__.py
│           └── routes/
│               ├── __init__.py
│               ├── auth.py              ← Login, refresh, me, logout (❌ BROKEN - FIXED)
│               ├── vendor.py            ← Signup, vendor CRUD (❌ BROKEN - FIXED)
│               ├── member.py            ← Member management
│               ├── membership.py        ← Membership plans
│               ├── payment.py           ← Razorpay payment
│               ├── classes.py           ← Class scheduling
│               ├── attendance.py        ← Attendance tracking
│               ├── reports.py           ← Reports generation
│               ├── developer.py         ← Developer API keys
│               ├── admin.py             ← Admin dashboard
│               └── stubs.py             ← Stub implementations
│
├── Frontend (React + TypeScript + Vite)
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── Dockerfile
│   ├── index.html
│   │
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       │
│       ├── pages/
│       │   ├── Landing.tsx
│       │   ├── Dashboard.tsx
│       │   ├── Auth/
│       │   │   ├── Login.tsx
│       │   │   └── Signup.tsx           ← Calls /vendors/signup
│       │   ├── Members.tsx
│       │   ├── Memberships.tsx
│       │   ├── Classes.tsx
│       │   ├── Attendance.tsx
│       │   ├── Payments.tsx
│       │   ├── Reports.tsx
│       │   ├── Settings.tsx
│       │   └── NotFound.tsx
│       │
│       ├── components/
│       │   └── layout/
│       │       ├── Header.tsx
│       │       ├── Sidebar.tsx
│       │       ├── LandingLayout.tsx
│       │       └── DashboardLayout.tsx
│       │
│       ├── services/
│       │   └── api.ts                  ← Axios client
│       │
│       ├── store/
│       │   └── auth.ts                 ← Zustand auth store
│       │
│       └── styles/
│
├── Documentation
│   ├── README.md
│   ├── PROJECT_SUMMARY.md
│   ├── IMPLEMENTATION_GUIDE.md
│   ├── PYCHARM_SETUP.md
│   ├── FRONTEND_GUIDE.md
│   ├── QUICK_REFERENCE.md
│   └── COMPLETE_SUMMARY.md
│
└── Configuration
    ├── .env (Not provided - needs setup)
    ├── .gitignore
    └── .dockerignore
```

---

## KEY FILES CONTENT

### 1. main.py

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.database import engine, Base
from app.api.routes import (
    auth, vendor, member, membership, payment, 
    classes, attendance, reports, developer, admin
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting GymBook Platform")
    Base.metadata.create_all(bind=engine)
    yield
    logger.info("Shutting down GymBook Platform")

app = FastAPI(
    title="GymBook - SaaS Gym Management Platform",
    description="Multi-tenant gym management system API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(vendor.router, prefix="/api/v1/vendors", tags=["Vendors"])
app.include_router(member.router, prefix="/api/v1/members", tags=["Members"])
app.include_router(membership.router, prefix="/api/v1/memberships", tags=["Memberships"])
app.include_router(payment.router, prefix="/api/v1/payments", tags=["Payments"])
app.include_router(classes.router, prefix="/api/v1/classes", tags=["Classes"])
app.include_router(attendance.router, prefix="/api/v1/attendance", tags=["Attendance"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(developer.router, prefix="/api/v1/developers", tags=["Developer Portal"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin Dashboard"])

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "GymBook API"}

@app.get("/")
async def root():
    return {
        "message": "Welcome to GymBook - SaaS Gym Management Platform",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
```

---

### 2. requirements.txt

```
# Core Framework
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6

# Database
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
alembic==1.13.1
sqlalchemy-utils==0.41.1

# Authentication & Security
PyJWT==2.8.0
python-jose==3.3.0
passlib[bcrypt]==1.7.4
bcrypt==4.0.1
python-dotenv==1.0.0
pydantic-settings==2.1.0

# Pydantic & Validation
pydantic[email]==2.5.0

# Payment Integration
razorpay==1.3.0

# Communication
requests==2.31.0
httpx==0.25.2
sendgrid==6.11.0
twilio==8.10.0

# Async & Background Jobs
celery==5.3.4
redis==5.0.1

# Utilities
python-dateutil==2.8.2
pytz==2023.3
uuid6==2024.7.10
pillow==10.1.0
python-json-logger==2.0.7

# AWS & Cloud
boto3==1.29.7

# Rate Limiting
slowapi==0.1.9

# Testing / Development
pytest==7.4.3
pytest-asyncio==0.23.3
black==23.12.0
flake8==6.1.0
isort==5.13.2
mypy==1.7.1
```

---

### 3. app/config.py

```python
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
    
    # API Keys and Secrets
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "")
    WHATSAPP_BUSINESS_ACCOUNT_ID: str = os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID", "")
    WHATSAPP_PHONE_NUMBER_ID: str = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
    WHATSAPP_API_TOKEN: str = os.getenv("WHATSAPP_API_TOKEN", "")
    SENDGRID_API_KEY: str = os.getenv("SENDGRID_API_KEY", "")
    FROM_EMAIL: str = os.getenv("FROM_EMAIL", "noreply@gymtrack.io")
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
    
    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
```

---

### 4. app/database.py

```python
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.pool import NullPool
from typing import Generator
import logging

from app.config import settings

logger = logging.getLogger(__name__)

# Create database engine
engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.SQLALCHEMY_ECHO,
    poolclass=NullPool,  # Suitable for serverless environments
    pool_pre_ping=True,  # Test connections before using
    connect_args={
        "connect_timeout": 10,
        "options": "-c statement_timeout=30000"  # 30 second timeout
    }
)

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False
)

# Declarative base for models
Base = declarative_base()

def init_db():
    """Initialize database - create all tables"""
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")

def get_db() -> Generator[Session, None, None]:
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Enable Row-Level Security (RLS) extensions
@event.listens_for(engine, "connect")
def enable_rls(dbapi_conn, connection_record):
    """Enable RLS and necessary PostgreSQL extensions"""
    try:
        cursor = dbapi_conn.cursor()
        cursor.execute("CREATE EXTENSION IF NOT EXISTS uuid-ossp")
        cursor.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
        cursor.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
        cursor.execute("COMMIT")
        cursor.close()
    except Exception as e:
        logger.warning(f"Could not enable PostgreSQL extensions: {e}")

class DatabaseError(Exception):
    """Custom exception for database errors"""
    pass

def get_session() -> Session:
    """Get a direct database session"""
    return SessionLocal()
```

---

### 5. app/security.py (Key Authentication File)

```python
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthCredentials
import logging

from app.config import settings

logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12
)

# Security scheme
security = HTTPBearer()

class TokenData:
    """Token payload data"""
    def __init__(self, user_id: str, vendor_id: str, email: str, role: str):
        self.user_id = user_id
        self.vendor_id = vendor_id
        self.email = email
        self.role = role

class AccessToken:
    """Access token management"""
    
    @staticmethod
    def create_access_token(
        user_id: str,
        vendor_id: str,
        email: str,
        role: str,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create JWT access token"""
        if expires_delta is None:
            expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        expire = datetime.now(timezone.utc) + expires_delta
        
        to_encode = {
            "user_id": user_id,
            "vendor_id": vendor_id,
            "email": email,
            "role": role,
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "type": "access"
        }
        
        encoded_jwt = jwt.encode(
            to_encode,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        return encoded_jwt
    
    @staticmethod
    def verify_access_token(token: str) -> TokenData:
        """Verify and decode access token"""
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM]
            )
            
            user_id: str = payload.get("user_id")
            vendor_id: str = payload.get("vendor_id")
            email: str = payload.get("email")
            role: str = payload.get("role")
            token_type: str = payload.get("type")
            
            if user_id is None or token_type != "access":
                raise credentials_exception
            
            return TokenData(
                user_id=user_id,
                vendor_id=vendor_id,
                email=email,
                role=role
            )
        
        except JWTError as e:
            logger.error(f"JWT verification error: {str(e)}")
            raise credentials_exception

class RefreshToken:
    """Refresh token management"""
    
    @staticmethod
    def create_refresh_token(
        user_id: str,
        vendor_id: str,
        email: str,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create JWT refresh token"""
        if expires_delta is None:
            expires_delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
        expire = datetime.now(timezone.utc) + expires_delta
        
        to_encode = {
            "user_id": user_id,
            "vendor_id": vendor_id,
            "email": email,
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "type": "refresh"
        }
        
        encoded_jwt = jwt.encode(
            to_encode,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        return encoded_jwt
    
    @staticmethod
    def verify_refresh_token(token: str) -> Dict[str, Any]:
        """Verify and decode refresh token"""
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM]
            )
            
            token_type: str = payload.get("type")
            
            if token_type != "refresh":
                raise credentials_exception
            
            return payload
        
        except JWTError as e:
            logger.error(f"JWT verification error: {str(e)}")
            raise credentials_exception

class PasswordManager:
    """Password hashing and verification"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password"""
        if not password or len(password) < 8:
            raise ValueError("Password must be at least 8 characters long")
        
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)

def get_current_user(credentials: HTTPAuthCredentials = Depends(security)) -> TokenData:
    """Dependency to get current authenticated user from Bearer token"""
    token = credentials.credentials
    return AccessToken.verify_access_token(token)

def require_role(*allowed_roles: str):
    """Dependency to check if user has required role"""
    async def check_role(current_user: TokenData = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires one of these roles: {', '.join(allowed_roles)}"
            )
        return current_user
    
    return check_role
```

---

### 6. frontend/src/services/api.ts

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          const response = await axiosInstance.post('/auth/refresh', {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token } = response.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return axiosInstance(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

const apiClient = {
  // Auth endpoints
  async signupVendor(data: {
    vendor_name: string;
    subdomain: string;
    email: string;
    phone: string;
    owner_name: string;
    owner_email: string;
    owner_password: string;
    city?: string;
    state?: string;
  }) {
    return axiosInstance.post('/vendors/signup', data);
  },

  async login(email: string, password: string) {
    return axiosInstance.post('/auth/login', { email, password });
  },

  async refreshToken(refreshToken: string) {
    return axiosInstance.post('/auth/refresh', { refresh_token: refreshToken });
  },

  async getCurrentUser() {
    return axiosInstance.get('/auth/me');
  },

  async logout() {
    return axiosInstance.post('/auth/logout');
  },

  // Vendor endpoints
  async getVendor(vendorId: string) {
    return axiosInstance.get(`/vendors/${vendorId}`);
  },

  async updateVendor(vendorId: string, data: any) {
    return axiosInstance.put(`/vendors/${vendorId}`, data);
  },

  // Member endpoints
  async getMembers(vendorId: string) {
    return axiosInstance.get(`/members?vendor_id=${vendorId}`);
  },

  async addMember(data: any) {
    return axiosInstance.post('/members', data);
  },

  // ... other endpoints
};

export default apiClient;
```

---

### 7. frontend/src/store/auth.ts

```typescript
import { create } from 'zustand';
import apiClient from '../services/api';

interface AuthState {
  user: any | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  signup: (vendorData: any) => Promise<void>;
  logout: () => void;
  setUser: (user: any) => void;
  fetchCurrentUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: localStorage.getItem('access_token'),
  refreshToken: localStorage.getItem('refresh_token'),
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.login(email, password);
      const { access_token, refresh_token } = response.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);

      set({
        accessToken: access_token,
        refreshToken: refresh_token,
        isLoading: false,
      });

      // Fetch current user
      const userResponse = await apiClient.getCurrentUser();
      set({ user: userResponse.data });
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || 'Login failed',
        isLoading: false,
      });
      throw error;
    }
  },

  signup: async (vendorData: any) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.signupVendor(vendorData);
      // Auto-login after signup
      await useAuthStore.getState().login(vendorData.owner_email, vendorData.owner_password);
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || 'Signup failed',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
    });
  },

  setUser: (user: any) => set({ user }),

  fetchCurrentUser: async () => {
    try {
      const response = await apiClient.getCurrentUser();
      set({ user: response.data });
    } catch (error) {
      set({ user: null });
    }
  },
}));
```

---

### 8. frontend/src/pages/Auth/Signup.tsx

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';

export default function Signup() {
  const navigate = useNavigate();
  const { signup, isLoading, error } = useAuthStore();
  const [formData, setFormData] = useState({
    vendor_name: '',
    subdomain: '',
    email: '',
    phone: '',
    owner_name: '',
    owner_email: '',
    owner_password: '',
    city: '',
    state: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.vendor_name.trim()) newErrors.vendor_name = 'Gym name is required';
    if (!formData.subdomain.trim()) newErrors.subdomain = 'Subdomain is required';
    if (formData.subdomain.length < 3) newErrors.subdomain = 'Subdomain must be at least 3 characters';
    if (!/^[a-z0-9-]+$/.test(formData.subdomain)) newErrors.subdomain = 'Subdomain can only contain lowercase letters, numbers, and hyphens';
    if (!formData.email.trim()) newErrors.email = 'Gym email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.owner_name.trim()) newErrors.owner_name = 'Owner name is required';
    if (!formData.owner_email.trim()) newErrors.owner_email = 'Owner email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.owner_email)) newErrors.owner_email = 'Invalid email format';
    if (!formData.owner_password) newErrors.owner_password = 'Password is required';
    if (formData.owner_password.length < 8) newErrors.owner_password = 'Password must be at least 8 characters';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await signup(formData);
      navigate('/dashboard');
    } catch (err) {
      console.error('Signup failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Register Your Gym</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Form fields */}
          <input
            type="text"
            name="vendor_name"
            placeholder="Gym Name"
            value={formData.vendor_name}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
          />
          {errors.vendor_name && <p className="text-red-500 text-sm">{errors.vendor_name}</p>}

          {/* ... more form fields ... */}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

### 9. frontend/src/pages/Auth/Login.tsx

```typescript
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Login</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-4 text-center text-gray-600">
          Don't have an account?{' '}
          <Link to="/signup" className="text-blue-500 hover:underline">
            Sign up here
          </Link>
        </p>
      </div>
    </div>
  );
}
```

---

## API ENDPOINTS SUMMARY

### Authentication Endpoints
- `POST /api/v1/auth/login` - Login (❌ BROKEN - FIXED)
- `POST /api/v1/auth/refresh` - Refresh token (❌ BROKEN - FIXED)
- `GET /api/v1/auth/me` - Get current user (❌ BROKEN - FIXED)
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/change-password` - Change password
- `POST /api/v1/auth/forgot-password` - Forgot password
- `POST /api/v1/auth/reset-password` - Reset password

### Vendor Endpoints
- `POST /api/v1/vendors/signup` - Register gym (❌ BROKEN - FIXED)
- `GET /api/v1/vendors/{vendor_id}` - Get vendor details
- `PUT /api/v1/vendors/{vendor_id}` - Update vendor
- `GET /api/v1/vendors/{vendor_id}/settings` - Get settings
- `PUT /api/v1/vendors/{vendor_id}/settings` - Update settings
- `POST /api/v1/vendors/{vendor_id}/staff` - Add staff member
- `GET /api/v1/vendors/{vendor_id}/staff` - List staff

### Member Endpoints
- `GET /api/v1/members` - List members
- `POST /api/v1/members` - Create member
- `GET /api/v1/members/{member_id}` - Get member
- `PUT /api/v1/members/{member_id}` - Update member
- `DELETE /api/v1/members/{member_id}` - Delete member

### Membership Endpoints
- `GET /api/v1/memberships` - List memberships
- `POST /api/v1/memberships` - Create membership
- `PUT /api/v1/memberships/{membership_id}` - Update membership
- `DELETE /api/v1/memberships/{membership_id}` - Cancel membership

### Payment Endpoints
- `POST /api/v1/payments/initiate` - Initiate payment
- `POST /api/v1/payments/webhook/razorpay` - Razorpay webhook

### Class Endpoints
- `GET /api/v1/classes` - List classes
- `POST /api/v1/classes` - Create class
- `PUT /api/v1/classes/{class_id}` - Update class
- `DELETE /api/v1/classes/{class_id}` - Delete class

### Attendance Endpoints
- `POST /api/v1/attendance/check-in` - Check in member
- `POST /api/v1/attendance/check-out` - Check out member
- `GET /api/v1/attendance/report` - Get attendance report

### Reports Endpoints
- `GET /api/v1/reports/financial` - Financial report
- `GET /api/v1/reports/members` - Member report
- `GET /api/v1/reports/attendance` - Attendance report

---

## DATABASE SCHEMA

### Tables
- `vendors` - Gym/fitness center accounts
- `vendor_settings` - Vendor configuration
- `vendor_subscriptions` - Subscription tracking
- `users` - Staff/admin users
- `members` - Gym members
- `memberships` - Member subscriptions
- `membership_plans` - Subscription plans
- `payments` - Payment transactions
- `classes` - Fitness classes
- `class_schedules` - Class schedules
- `attendance` - Attendance records
- `api_keys` - Developer API keys
- `webhooks` - Webhook configurations

---

## ENVIRONMENT VARIABLES REQUIRED

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/gymbook_db

# JWT/Security
SECRET_KEY=your-secret-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Razorpay
RAZORPAY_KEY_ID=key_id_here
RAZORPAY_KEY_SECRET=key_secret_here

# Email
SENDGRID_API_KEY=sg_api_key_here
FROM_EMAIL=noreply@gymtrack.io

# SMS
TWILIO_ACCOUNT_SID=sid_here
TWILIO_AUTH_TOKEN=token_here
TWILIO_PHONE_NUMBER=+1234567890

# AWS S3
AWS_ACCESS_KEY_ID=key_here
AWS_SECRET_ACCESS_KEY=secret_here
AWS_S3_BUCKET=gymtrack-uploads
AWS_REGION=us-east-1

# Redis/Celery
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2

# Application
DEBUG=False
HOST=0.0.0.0
PORT=8000

# Frontend
VITE_API_URL=http://localhost:8000/api/v1
```

---

**This is the complete dump of your gym management platform project.**
