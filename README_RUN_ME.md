# 🏋️ GymBook — Complete Build (v10)

A full gym management platform: members, memberships, payments, classes,
attendance, renewals, dashboard with charts, webcam member photos, and a
modern mobile-friendly UI. **Comes with mock test data.**

---

## ✅ What you need installed (one time)
- **Python 3.11+** (3.12 or 3.13 fine)
- **Node.js 18+**
- **Docker Desktop** (for the database) — or your own PostgreSQL

---

## 🚀 Run it — 4 steps

### 1. Start the database (Docker)
```bash
docker run --name gymdb -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=gymbook_db -p 5433:5432 -d postgres:15
```
(If you already created it before: `docker start gymdb`)

### 2. Start the backend
```bash
cd gym_platform_final
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
python3 main.py
```
Backend runs at **http://localhost:8000** (API docs at /docs).
Leave this terminal running.

### 3. Load the mock test data (NEW terminal, same folder)
```bash
cd gym_platform_final
source venv/bin/activate
python3 seed_data.py
```
This creates a demo gym with 15 members, plans, payments, classes,
attendance, and memberships (some expiring/expired so you can see renewals).

### 4. Start the frontend (NEW terminal)
```bash
cd gym_platform_final/frontend
npm install
npm run dev
```
Open **http://localhost:3000**

---

## 🔑 Log in with the demo account
```
Email:    demo@gymbook.com
Password: Demo@1234
```
Or click "Sign Up" to create your own gym from scratch.

---

## 📊 What the mock data gives you
- **15 members** (varied join dates)
- **4 plans** (Monthly / Quarterly / Half-Yearly / Annual)
- **15 memberships** — 3 expired, 3 expiring within 7 days, 9 active
  (so the **Renewals** page and dashboard alert have real data)
- **~39 payments** spread over 6 months (drives the **revenue chart**)
- **4 classes** with enrollment
- **~43 attendance** records incl. some checked-in-now

Re-running `seed_data.py` is safe — it clears and recreates the demo gym.

---

## ✨ Features
- Dashboard with revenue + member-growth charts and renewal alerts
- Members: add/edit/delete, search, **webcam photo capture**, profile view
- Memberships: plans + assign with **custom start/end dates**
- Renewals: auto-detects expiring/expired, one-click renew
- Payments: record (cash/UPI), history, refund
- Classes: create + enroll with capacity bars
- Attendance: check in/out with live stats
- Settings: edit gym profile
- Modern gym theme (dark slate + lime-green), fully mobile-responsive

---

## ⚙️ Ports
- Backend: 8000 · Frontend: 3000 · Database: 5433
- The frontend already points at backend :8000 (see `frontend/.env`).

## 🆘 Common issues
- **"connection refused" on startup** → database isn't running. Run step 1.
- **`pip` not found** → use `pip3`, or activate the venv first.
- **camera not working** → allow camera permission; only works on localhost/https.
- **seed says "already exists"** → that's fine, it clears & recreates.

---

Tested: backend **54/54 automated tests pass**, frontend builds clean.
