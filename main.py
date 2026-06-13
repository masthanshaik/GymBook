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
from app.api.routes import measurements, leads, expenses, lockers, staff

# Configure logging
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
    version="2.0.0",
    lifespan=lifespan
)

# CORS Configuration
import os as _os
_frontend_origins = _os.getenv("FRONTEND_ORIGINS", "")
_allowed = [
    "http://localhost:3000", "http://localhost:3001",
    "http://localhost:3002", "http://localhost:3003",
    "http://127.0.0.1:3000", "http://127.0.0.1:3001",
]
if _frontend_origins:
    _allowed += [o.strip() for o in _frontend_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core routes
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(vendor.router, prefix="/api/v1/vendors", tags=["Vendors"])
app.include_router(member.router, prefix="/api/v1/members", tags=["Members"])
app.include_router(membership.router, prefix="/api/v1/memberships", tags=["Memberships"])
app.include_router(payment.router, prefix="/api/v1/payments", tags=["Payments"])
app.include_router(classes.router, prefix="/api/v1/classes", tags=["Classes"])
app.include_router(attendance.router, prefix="/api/v1/attendance", tags=["Attendance"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])

# New feature routes
app.include_router(measurements.router, prefix="/api/v1/measurements", tags=["Body Measurements"])
app.include_router(leads.router, prefix="/api/v1/leads", tags=["CRM Leads"])
app.include_router(expenses.router, prefix="/api/v1/expenses", tags=["Expenses"])
app.include_router(lockers.router, prefix="/api/v1/lockers", tags=["Lockers"])
app.include_router(staff.router, prefix="/api/v1/staff", tags=["Staff Management"])

# Developer & admin
app.include_router(developer.router, prefix="/api/v1/developers", tags=["Developer Portal"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin Dashboard"])


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "GymBook API", "version": "2.0.0"}


@app.get("/")
async def root():
    return {
        "message": "Welcome to GymBook - SaaS Gym Management Platform",
        "version": "2.0.0",
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
