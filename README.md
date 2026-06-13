# GymBook - SaaS Gym Management Platform

A modern, multi-tenant SaaS platform for gym and fitness center management built with FastAPI, PostgreSQL, and Redis.

## Features

✅ **Multi-Tenant Architecture** - Complete vendor isolation using Row-Level Security  
✅ **Vendor Management** - Gym registration, settings, subscription tracking  
✅ **Member Management** - Member profiles, status tracking, communication preferences  
✅ **Membership Plans** - Flexible plan creation with pricing, features, and limits  
✅ **Payment Integration** - Razorpay, UPI, and multiple payment methods  
✅ **Class Management** - Class scheduling, member enrollment, attendance tracking  
✅ **Attendance Tracking** - Multiple check-in methods (QR, RFID, manual)  
✅ **Real-Time Analytics** - Financial reports, member insights, attendance metrics  
✅ **API-First Design** - Developer portal with API keys, webhooks, and documentation  
✅ **Communication** - WhatsApp, Email, and SMS integration  
✅ **Admin Dashboard** - Platform-wide analytics and vendor management  
✅ **Security** - JWT authentication, API key management, RBAC  
✅ **Scalability** - Stateless design, caching, background jobs with Celery  

## Tech Stack

- **Backend Framework**: FastAPI 0.104.1
- **Database**: PostgreSQL 15 with SQLAlchemy ORM
- **Caching**: Redis 7
- **Task Queue**: Celery with Redis broker
- **Authentication**: JWT + OAuth 2.0
- **Payment**: Razorpay
- **Communication**: SendGrid (Email), Twilio (SMS), WhatsApp Business API
- **Cloud Storage**: AWS S3
- **Containerization**: Docker & Docker Compose

## Project Structure

```
gym_management_platform/
├── main.py                          # FastAPI application entry point
├── requirements.txt                 # Python dependencies
├── Dockerfile                       # Docker build configuration
├── docker-compose.yml              # Local development setup
├── .env.example                    # Environment variables template
├── README.md                       # This file
│
├── app/
│   ├── __init__.py
│   ├── config.py                   # Configuration and settings
│   ├── database.py                 # Database setup and session management
│   ├── models.py                   # SQLAlchemy models (15 core tables)
│   ├── schemas.py                  # Pydantic schemas for validation
│   ├── security.py                 # Authentication and authorization
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── auth.py             # Authentication endpoints
│   │       ├── vendor.py           # Vendor management endpoints
│   │       ├── member.py           # Member management endpoints
│   │       ├── membership.py       # Membership plan endpoints
│   │       ├── payment.py          # Payment processing endpoints
│   │       ├── classes.py          # Class management endpoints
│   │       ├── attendance.py       # Attendance tracking endpoints
│   │       ├── reports.py          # Analytics and reports endpoints
│   │       ├── developer.py        # Developer portal endpoints
│   │       └── admin.py            # Admin dashboard endpoints
│   │
│   ├── services/                   # Business logic layer (TODO)
│   │   ├── __init__.py
│   │   ├── payment_service.py
│   │   ├── member_service.py
│   │   ├── email_service.py
│   │   └── webhook_service.py
│   │
│   ├── tasks/                      # Celery background tasks (TODO)
│   │   ├── __init__.py
│   │   ├── payment_tasks.py
│   │   ├── notification_tasks.py
│   │   └── report_tasks.py
│   │
│   └── utils/                      # Utility functions (TODO)
│       ├── __init__.py
│       ├── pagination.py
│       ├── decorators.py
│       └── helpers.py
│
└── tests/                          # Unit and integration tests (TODO)
    ├── __init__.py
    ├── test_auth.py
    ├── test_vendor.py
    ├── test_payment.py
    └── conftest.py
```

## Database Schema

### Core Tables (15 tables)

**Vendor Management**
- `vendors` - Gym/fitness center accounts
- `vendor_subscriptions` - Subscription tracking
- `vendor_settings` - Configuration per vendor

**User Management**
- `users` - Staff, trainers, admins
- `activity_logs` - Audit trail

**Member Management**
- `members` - Member profiles
- `memberships` - Member-plan associations
- `membership_plans` - Plan definitions
- `member_feedback` - Feedback and complaints

**Payment & Billing**
- `payments` - Transaction records
- `invoices` - Billing documents

**Classes & Attendance**
- `classes` - Class definitions
- `class_schedules` - Recurring schedules
- `class_members` - Member enrollments
- `attendance` - Check-in/check-out records

**Communications**
- `email_logs` - Email delivery tracking
- `sms_logs` - SMS delivery tracking
- `whatsapp_logs` - WhatsApp message tracking

**API & Webhooks**
- `api_keys` - Developer API keys
- `api_usage` - API call tracking
- `webhooks` - Webhook subscriptions
- `webhook_logs` - Delivery logs

## Getting Started

### Prerequisites

- Python 3.11+
- Docker & Docker Compose
- PostgreSQL 15 (or use Docker)
- Redis 7 (or use Docker)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-repo/gym-management-platform.git
   cd gym_management_platform
   ```

2. **Copy environment configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start services with Docker Compose**
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations** (first time)
   ```bash
   docker-compose exec api alembic upgrade head
   ```

5. **Create initial data** (optional)
   ```bash
   docker-compose exec api python -c "from app.database import init_db; init_db()"
   ```

6. **Access the application**
   - API: http://localhost:8000
   - API Docs: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc
   - Database GUI (Adminer): http://localhost:8080
   - Redis GUI (Redis Commander): http://localhost:8081

### Manual Setup (without Docker)

1. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up database**
   ```bash
   # Ensure PostgreSQL is running
   # Update DATABASE_URL in .env
   python -c "from app.database import init_db; init_db()"
   ```

4. **Run the application**
   ```bash
   uvicorn main:app --reload
   ```

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/change-password` - Change password

### Vendors
- `POST /api/v1/vendors/signup` - Register new gym
- `GET /api/v1/vendors/{vendor_id}` - Get vendor details
- `PUT /api/v1/vendors/{vendor_id}` - Update vendor
- `GET /api/v1/vendors/{vendor_id}/settings` - Get settings
- `PUT /api/v1/vendors/{vendor_id}/settings` - Update settings
- `POST /api/v1/vendors/{vendor_id}/staff` - Add staff member
- `GET /api/v1/vendors/{vendor_id}/staff` - List staff

### Members (In Progress)
- `GET /api/v1/members/` - List members
- `POST /api/v1/members/` - Create member
- `GET /api/v1/members/{member_id}` - Get member
- `PUT /api/v1/members/{member_id}` - Update member
- `DELETE /api/v1/members/{member_id}` - Delete member

### Memberships (In Progress)
- `GET /api/v1/memberships/plans` - List plans
- `POST /api/v1/memberships/plans` - Create plan
- `GET /api/v1/memberships/{id}` - Get membership
- `POST /api/v1/memberships/{id}/renew` - Renew membership
- `POST /api/v1/memberships/{id}/cancel` - Cancel membership

### Payments (In Progress)
- `POST /api/v1/payments/initiate` - Initiate payment
- `GET /api/v1/payments/{id}` - Get payment details
- `POST /api/v1/payments/{id}/refund` - Refund payment
- `POST /api/v1/payments/webhook/razorpay` - Razorpay webhook
- `GET /api/v1/payments/history/{member_id}` - Payment history

### Reports (In Progress)
- `GET /api/v1/reports/financial` - Financial report
- `GET /api/v1/reports/members` - Members report
- `GET /api/v1/reports/attendance` - Attendance report
- `GET /api/v1/reports/export/pdf` - Export as PDF
- `GET /api/v1/reports/export/excel` - Export as Excel

### Developer Portal (In Progress)
- `GET /api/v1/developers/api-keys` - List API keys
- `POST /api/v1/developers/api-keys` - Create API key
- `GET /api/v1/developers/webhooks` - List webhooks
- `POST /api/v1/developers/webhooks` - Create webhook
- `GET /api/v1/developers/usage` - API usage stats

### Admin (In Progress)
- `GET /api/v1/admin/vendors` - List vendors
- `GET /api/v1/admin/analytics` - Platform analytics
- `GET /api/v1/admin/system-health` - System health
- `GET /api/v1/admin/payments` - All payments
- `GET /api/v1/admin/support-tickets` - Support tickets

## Authentication

The API uses JWT (JSON Web Tokens) for authentication.

**How to authenticate:**

1. Register a vendor via `/api/v1/vendors/signup`
2. Login via `/api/v1/auth/login` to get tokens:
   ```json
   {
     "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
     "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
     "token_type": "bearer",
     "expires_in": 1800
   }
   ```
3. Include token in Authorization header:
   ```
   Authorization: Bearer {access_token}
   ```

**Refresh token:**
```bash
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

## Multi-Tenancy

The platform uses **Row-Level Security (RLS)** for data isolation:

- Every query includes `vendor_id` filter
- JWT token contains vendor context
- Middleware enforces vendor isolation
- No cross-vendor data access possible

## Configuration

All configuration is loaded from environment variables. See `.env.example` for all available options.

### Key Configuration Variables

```
# Application
DEBUG=False
HOST=0.0.0.0
PORT=8000

# Database
DATABASE_URL=postgresql://user:pass@localhost/db

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
SECRET_KEY=your-secret-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Payment (Razorpay)
RAZORPAY_KEY_ID=xxx
RAZORPAY_KEY_SECRET=xxx

# WhatsApp
WHATSAPP_API_TOKEN=xxx
WHATSAPP_BUSINESS_ACCOUNT_ID=xxx
```

## Testing

Run tests with pytest:

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_auth.py

# Run with coverage
pytest --cov=app tests/

# Run in parallel
pytest -n auto
```

## Database Migrations

Using Alembic for database migrations:

```bash
# Create a new migration
alembic revision --autogenerate -m "Add new column"

# Apply migrations
alembic upgrade head

# Revert last migration
alembic downgrade -1
```

## Background Tasks

Background jobs are handled with Celery:

```bash
# Start Celery worker
celery -A app.tasks worker --loglevel=info

# Or with Docker:
docker-compose up -d celery_worker --profile with-celery
```

## Deployment

### Cloud Deployment (AWS/GCP/Azure)

1. **Build Docker image**
   ```bash
   docker build -t gymbook:latest .
   ```

2. **Push to container registry**
   ```bash
   docker tag gymbook:latest your-registry/gymbook:latest
   docker push your-registry/gymbook:latest
   ```

3. **Deploy to Kubernetes/ECS/App Engine**
   - See deployment documentation in `/docs`

### Environment Configuration for Production

- Set `DEBUG=False`
- Use strong `SECRET_KEY` (32+ characters)
- Enable HTTPS/TLS
- Set up proper CORS origins
- Configure rate limiting
- Enable database backups
- Set up monitoring and alerting

## Security Considerations

✅ Passwords hashed with bcrypt (12 rounds)  
✅ JWT tokens with expiration  
✅ Row-level security for multi-tenancy  
✅ API rate limiting  
✅ CORS configuration  
✅ SQL injection prevention (SQLAlchemy ORM)  
✅ CSRF protection ready  
✅ Secure headers implemented  

**TODO:**
- Add request signing for API calls
- Implement API key rotation
- Add webhook signature verification
- Implement audit logging
- Add encryption at rest

## Monitoring & Logging

The application logs to stdout by default. For production:

1. **Structured Logging**
   ```python
   import logging
   logger = logging.getLogger(__name__)
   logger.info("User created", extra={"user_id": user_id, "vendor_id": vendor_id})
   ```

2. **Error Tracking** - Integrate with Sentry
3. **Metrics** - Use Prometheus + Grafana
4. **Alerting** - Setup PagerDuty or similar

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## Development Roadmap

### Phase 1 (Complete)
- ✅ Project structure and setup
- ✅ Database models
- ✅ Authentication system
- ✅ Vendor management
- ✅ Basic API endpoints

### Phase 2 (In Progress)
- [ ] Complete all member endpoints
- [ ] Complete membership endpoints
- [ ] Razorpay integration
- [ ] Member portal
- [ ] Basic analytics

### Phase 3 (Planned)
- [ ] Class management
- [ ] Attendance tracking
- [ ] WhatsApp integration
- [ ] Advanced reports
- [ ] Email notifications

### Phase 4 (Future)
- [ ] Mobile app (React Native)
- [ ] Biometric integration
- [ ] AI churn prediction
- [ ] Advanced API features
- [ ] Marketplace

## Support

For issues and questions:
- 📧 Email: support@gymtrack.io
- 💬 Chat: [Live chat coming soon]
- 📚 Docs: https://docs.gymtrack.io
- 🐛 Issues: GitHub Issues

## License

This project is proprietary and confidential.

## Contact

- Project Lead: [Your Name]
- Email: contact@gymtrack.io
- Website: https://www.gymtrack.io

---

**Made with ❤️ for the fitness industry**
