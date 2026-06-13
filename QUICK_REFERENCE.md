# GymBook API - Quick Reference Guide

## Quick Start (30 seconds)

```bash
# 1. Start services
docker-compose up -d

# 2. Initialize database (first time only)
docker-compose exec api python -c "from app.database import init_db; init_db()"

# 3. API ready at
http://localhost:8000/docs  # Swagger UI with interactive testing
```

## Authentication Flow

```
1. SIGNUP
   POST /api/v1/vendors/signup
   → Get vendor_id, owner user created

2. LOGIN
   POST /api/v1/auth/login (email, password)
   → Returns: access_token, refresh_token

3. USE TOKEN
   Add header: Authorization: Bearer {access_token}

4. REFRESH TOKEN (expires in 30 min)
   POST /api/v1/auth/refresh (refresh_token)
   → Returns: new access_token
```

## Database Models Summary

### Multi-Tenancy
- **vendors**: Gym accounts (id, subdomain, email, subscription_plan, status)
- **vendor_subscriptions**: Billing tracking (vendor_id, plan, price, next_billing_date)
- **vendor_settings**: Config per gym (working_hours, payment_keys, feature_flags)

### Users & Roles
- **users**: Staff/trainers/members (id, vendor_id, email, role, is_active)
  - Roles: gym_owner, gym_manager, front_desk, trainer, member, api_consumer
- **activity_logs**: Audit trail (user_id, action, entity_type, old_values, new_values)

### Members & Memberships
- **members**: Member profiles (id, vendor_id, email, phone, first_name, status)
  - Status: active, inactive, expired, suspended, trial
- **memberships**: Member-Plan associations (member_id, plan_id, started_date, ended_date)
  - Tracks which members have which plans and when they expire
- **membership_plans**: Plan templates (name, duration_months, price, features, capacity)

### Payments
- **payments**: Transactions (id, vendor_id, member_id, amount, status, razorpay_payment_id)
  - Status: pending, completed, failed, refunded, cancelled
  - Methods: razorpay, upi, card, wallet, cash
- **invoices**: Billing documents (invoice_number, amount, issued_date, pdf_url)

### Classes & Attendance
- **classes**: Class definitions (name, class_type, capacity, trainer_id)
- **class_schedules**: Recurring schedules (class_id, day_of_week, start_time, location)
- **class_members**: Enrollments (class_id, member_id, enrolled_date)
- **attendance**: Check-in/check-out records (member_id, check_in_time, check_out_time, status)

### Communications
- **email_logs**: Email tracking (recipient_email, subject, status, sendgrid_message_id)
- **sms_logs**: SMS tracking (recipient_phone, message_body, status, twilio_message_id)
- **whatsapp_logs**: WhatsApp tracking (recipient_phone, template_name, status, message_id)

### API & Webhooks
- **api_keys**: Developer credentials (key, key_hash, permissions, rate_limit)
- **api_usage**: Call tracking (api_key_id, endpoint, method, status_code, response_time)
- **webhooks**: Subscriptions (url, events, secret_key, is_active)
  - Events: member.*, membership.*, payment.*, attendance.*
- **webhook_logs**: Delivery tracking (webhook_id, event_type, status_code, retry_count)

## API Endpoints Reference

### 🔐 Authentication (6 endpoints)
```
POST   /api/v1/auth/login              Login with email/password
POST   /api/v1/auth/refresh            Refresh access token
GET    /api/v1/auth/me                 Get current user
POST   /api/v1/auth/logout             Logout (optional)
POST   /api/v1/auth/change-password    Change password
POST   /api/v1/auth/forgot-password    Request password reset
```

### 🏋️ Vendors (7 endpoints)
```
POST   /api/v1/vendors/signup          Register new gym
GET    /api/v1/vendors/{id}            Get vendor details
PUT    /api/v1/vendors/{id}            Update vendor info
GET    /api/v1/vendors/{id}/settings   Get vendor settings
PUT    /api/v1/vendors/{id}/settings   Update settings
POST   /api/v1/vendors/{id}/staff      Add staff member
GET    /api/v1/vendors/{id}/staff      List staff
```

### 👥 Members (5 endpoints - TODO)
```
GET    /api/v1/members/                List members (with filters)
POST   /api/v1/members/                Create member
GET    /api/v1/members/{id}            Get member details
PUT    /api/v1/members/{id}            Update member
DELETE /api/v1/members/{id}            Soft delete member
```

### 📋 Memberships (5 endpoints - TODO)
```
GET    /api/v1/memberships/plans       List plans
POST   /api/v1/memberships/plans       Create plan
GET    /api/v1/memberships/{id}        Get membership details
POST   /api/v1/memberships/{id}/renew  Renew membership
POST   /api/v1/memberships/{id}/cancel Cancel/freeze
```

### 💳 Payments (6 endpoints - TODO)
```
POST   /api/v1/payments/initiate       Create Razorpay order
GET    /api/v1/payments/{id}           Get payment details
POST   /api/v1/payments/{id}/refund    Refund payment
POST   /api/v1/payments/webhook/razorpay  Handle webhook
GET    /api/v1/payments/history/{id}   Payment history
```

### 🏃 Classes (5 endpoints - TODO)
```
GET    /api/v1/classes/                List classes
POST   /api/v1/classes/                Create class
GET    /api/v1/classes/{id}            Get class details
POST   /api/v1/classes/{id}/enroll     Enroll member
GET    /api/v1/classes/{id}/attendance Attendance
```

### 📊 Attendance (4 endpoints - TODO)
```
POST   /api/v1/attendance/check-in     Check in member
POST   /api/v1/attendance/check-out    Check out member
GET    /api/v1/attendance/report       Attendance report
GET    /api/v1/attendance/member/{id}  Member history
```

### 📈 Reports (6 endpoints - TODO)
```
GET    /api/v1/reports/financial       Financial report
GET    /api/v1/reports/members         Member insights
GET    /api/v1/reports/attendance      Attendance metrics
GET    /api/v1/reports/classes         Class utilization
GET    /api/v1/reports/export/pdf      Export as PDF
GET    /api/v1/reports/export/excel    Export as Excel
```

### 🔌 Developer Portal (7 endpoints - TODO)
```
GET    /api/v1/developers/api-keys     List API keys
POST   /api/v1/developers/api-keys     Create API key
DELETE /api/v1/developers/api-keys/{id} Delete API key
GET    /api/v1/developers/webhooks     List webhooks
POST   /api/v1/developers/webhooks     Create webhook
GET    /api/v1/developers/usage        API usage stats
GET    /api/v1/developers/docs         API documentation
```

### ⚙️ Admin Dashboard (8 endpoints - TODO)
```
GET    /api/v1/admin/vendors           List vendors
GET    /api/v1/admin/vendors/{id}      Get vendor details
POST   /api/v1/admin/vendors/{id}/suspend  Suspend vendor
POST   /api/v1/admin/vendors/{id}/activate Activate vendor
GET    /api/v1/admin/analytics         Platform analytics
GET    /api/v1/admin/system-health     System health
GET    /api/v1/admin/payments          All payments
GET    /api/v1/admin/support-tickets   Support tickets
```

## Common API Responses

### Success Response (200-201)
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Paginated Response (200)
```json
{
  "total": 100,
  "page": 1,
  "page_size": 20,
  "items": [...]
}
```

### Error Response (400, 401, 403, 404, 422, 500)
```json
{
  "error": "Validation Error",
  "detail": "Email already registered",
  "status_code": 409,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Common Errors

| Code | Meaning | Solution |
|------|---------|----------|
| 400 | Bad Request | Check request body format |
| 401 | Unauthorized | Login first or refresh token |
| 403 | Forbidden | Don't have permission (check role) |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Email/subdomain already exists |
| 422 | Validation Error | Check field types and constraints |
| 429 | Rate Limited | Too many requests, wait before retrying |
| 500 | Server Error | Check logs: `docker-compose logs api` |

## Environment Variables (Key Ones)

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/gymbook_db

# Authentication
SECRET_KEY=your-32-character-secret-key-here

# Razorpay (for payments)
RAZORPAY_KEY_ID=xxx
RAZORPAY_KEY_SECRET=xxx

# WhatsApp
WHATSAPP_API_TOKEN=xxx

# SendGrid (email)
SENDGRID_API_KEY=xxx

# Twilio (SMS)
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
```

## File Locations

```
app/
  ├── config.py          ← Change settings here
  ├── models.py          ← Database schemas
  ├── schemas.py         ← API request/response validation
  ├── security.py        ← Auth logic
  ├── database.py        ← DB connection
  └── api/routes/
      ├── auth.py        ← Already implemented ✓
      ├── vendor.py      ← Partially implemented
      └── *.py           ← TODO implementations
```

## Useful Commands

```bash
# View logs
docker-compose logs -f api

# Connect to database
docker-compose exec postgres psql -U gymbook_user -d gymbook_db

# Run migrations (when models change)
docker-compose exec api alembic upgrade head

# Stop everything
docker-compose down

# Reset everything (⚠️ loses data)
docker-compose down -v

# List running containers
docker-compose ps
```

## Test Scenarios

### Scenario 1: Complete Signup Flow
```bash
# 1. Vendor signup
curl -X POST http://localhost:8000/api/v1/vendors/signup \
  -H "Content-Type: application/json" \
  -d '{
    "vendor_name": "FitZone Gym",
    "subdomain": "fitzzone",
    "email": "info@fitzzone.com",
    "phone": "9876543210",
    "owner_name": "Raj Kumar",
    "owner_email": "raj@fitzzone.com",
    "owner_password": "SecurePass123!",
    "city": "Bangalore"
  }'

# 2. Owner login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "raj@fitzzone.com",
    "password": "SecurePass123!"
  }'

# 3. Get current user (with token)
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer {access_token}"
```

### Scenario 2: Member Signup (Coming Soon)
```bash
# 1. Member signup
curl -X POST http://localhost:8000/api/v1/members/ \
  -H "Authorization: Bearer {gym_owner_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "phone": "9876543210",
    "first_name": "John",
    "last_name": "Doe"
  }'

# 2. Create membership (assign plan)
curl -X POST http://localhost:8000/api/v1/memberships/ \
  -H "Authorization: Bearer {gym_owner_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "member_id": "member-uuid",
    "plan_id": "plan-uuid",
    "original_price": 999.00
  }'

# 3. Initiate payment
curl -X POST http://localhost:8000/api/v1/payments/initiate \
  -H "Authorization: Bearer {gym_owner_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "member_id": "member-uuid",
    "amount": 999.00,
    "payment_method": "razorpay",
    "purpose": "new_membership"
  }'
```

## Performance Tips

1. **Use pagination for list endpoints**
   ```
   GET /api/v1/members?page=1&page_size=50
   ```

2. **Filter instead of fetching all**
   ```
   GET /api/v1/members?status=active&city=bangalore
   ```

3. **Use caching for reports**
   - Reports are expensive queries
   - Cache results for 1 hour

4. **Batch operations**
   - Bulk send messages instead of individual calls
   - Bulk create invoices

## Security Reminders

- Never commit `.env` file
- Change SECRET_KEY in production
- Use HTTPS in production
- Validate all inputs (done via Pydantic)
- Log all important actions (done)
- Rate limit API calls (framework ready)
- Use strong passwords

## What's Next?

1. **Implement remaining endpoints** (see IMPLEMENTATION_GUIDE.md)
2. **Add service layer** for complex business logic
3. **Integrate Razorpay** for payments
4. **Add Celery tasks** for background jobs
5. **Build frontend** (React/Vue) to consume API
6. **Deploy to production** (AWS/GCP/Azure)

---

**For detailed implementation guide, see IMPLEMENTATION_GUIDE.md**
**For full documentation, see README.md**
