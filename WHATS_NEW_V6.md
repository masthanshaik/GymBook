# Gym Management Platform — v6 (Renewal Reminders)

Builds on v5. Adds automatic membership renewal reminders, fully wired in the UI.

## New in this version

### Auto renewal reminders (backend)
- `GET /memberships/renewals?days=N` — returns memberships **expiring within N
  days** and those **already expired**, with member name/phone/email + plan + price.
- **Auto-expiry**: any ACTIVE membership past its end date is automatically
  flipped to EXPIRED when this runs.
- Dashboard summary now includes `renewals_due` (count expiring within 7 days).

### Renewals page (new UI — in the sidebar)
- Three summary cards: Expiring Soon / Expired / Total needing action.
- Separate tables for expired (red) and expiring-soon (yellow) memberships.
- **One-click Renew** button on each row — extends the membership by its plan
  duration and removes it from the list.
- Window selector: next 7 / 14 / 30 days.

### Dashboard alert banner
- If any memberships need attention, a yellow banner appears at the top of the
  dashboard linking straight to the Renewals page.

## Full feature list (everything working)
- Auth, signup, login, sessions
- Dashboard: live stats, revenue + member charts, renewals alert
- Members: CRUD, search, detail view
- Memberships: plans (create / assign / deactivate)
- **Renewals: reminders, one-click renew, auto-expiry**
- Payments: record, history, refund
- Classes: create, enroll
- Attendance: check in/out, stats
- Settings: gym profile

## Verified before shipping
- Backend: **36/36 integration tests pass** (25 core + 3 charts + 8 renewals).
- App boots: **71 routes**, renewals route confirmed registered.
- Frontend: **strict type-check passes**, **production build clean** (code-split).

## How to run
Backend: `pip install -r requirements.txt` → `python3 main.py`
Frontend: `cd frontend && npm install && npm run dev` → http://localhost:3000

Reminder: `frontend/.env` VITE_API_URL must match your backend port (set to 8001).

## Note on "auto" reminders
The system *detects* and *surfaces* renewals automatically every time the page
or dashboard loads, and auto-expires overdue memberships. Actually *sending*
WhatsApp/email reminders still needs a provider account (Twilio/SendGrid) — that
remains the one external dependency for outbound messaging.
