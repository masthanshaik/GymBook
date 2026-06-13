# Gym Management Platform — v5 (Complete Build)

Builds on v4. Adds dashboard charts and all the optional polish items.

## New in this version

### Dashboard charts
- **Revenue trend** — line chart, last 6 months (real payment data).
- **New members** — bar chart, last 6 months (real signup data).
- Powered by new backend endpoint `GET /reports/charts`.

### Member detail view
- Click **View** on any member → modal showing their memberships, recent
  payments, recent visits, plus headline stats (total paid, visits, active plans).
- Powered by new backend endpoint `GET /reports/member-detail/{id}`.

### Plan management
- Plans can now be **deactivated** from the Memberships page.
- Inactive plans are visually greyed out and can't be assigned.

## Everything working (full feature list)
- Auth: signup, login, token persistence, protected routes
- Dashboard: live stat cards + revenue & member charts
- Members: full CRUD, search, detail view
- Memberships: create plan, assign to member, deactivate plan
- Payments: record (cash/UPI), history, refund
- Classes: create, enroll members (capacity enforced)
- Attendance: check-in / check-out, live stats
- Settings: edit gym profile

## Verified before shipping
- Backend: **28/28 integration tests pass** (25 core + 3 chart/detail).
- App boots cleanly: **70 routes registered**, root + health return 200.
- Frontend: **strict `tsc --noEmit` passes**, **production build succeeds**
  with no warnings (code-split into react / charts / app chunks).

## How to run
Backend:
```
pip install -r requirements.txt
# edit .env: DATABASE_URL + SECRET_KEY
python3 main.py              # http://localhost:8000  (or --port 8001)
```
Frontend:
```
cd frontend
npm install
# IMPORTANT: make sure frontend/.env VITE_API_URL matches your backend port
npm run dev                  # http://localhost:3000
```

## Port reminder
`frontend/.env` is set to `http://127.0.0.1:8001/api/v1`. If you run the
backend on port 8000 (plain `python3 main.py`), change it to `:8000`.

## Genuinely not built (out of scope for this build)
- Live Razorpay checkout popup (backend records payments; the customer
  card-entry flow needs Razorpay live keys + their JS widget)
- WhatsApp / email notifications (needs a provider like Twilio)
- PDF / Excel report file export
- Member self-service portal (separate member-facing app)
