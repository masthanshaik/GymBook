# Gym Management Platform — v7 (Port fix)

Same features as v6. This release fixes the port mismatch so the app works
out of the box with no manual config.

## What changed
Everything now consistently uses **port 8000** (the backend's default):
- `frontend/.env` → `VITE_API_URL=http://127.0.0.1:8000/api/v1`
- `frontend/.env.example` → same
- `frontend/src/services/api.ts` fallback → `http://127.0.0.1:8000/api/v1`
- `backend/.env` → added explicit `PORT=8000`

Verified: **zero references to port 8001 remain anywhere** in the codebase.

## How to run (now truly just works)
Backend:
```
pip install -r requirements.txt
# edit .env: set DATABASE_URL + a strong SECRET_KEY
python3 main.py            # runs on http://localhost:8000
```
Frontend (new terminal):
```
cd frontend
npm install
npm run dev                # http://localhost:3000  → talks to :8000 automatically
```
No port editing needed. CORS already allows localhost:3000.

## Verified in this release
- UI ↔ backend wiring: **35/35 connections** (exact request + response shapes).
- Built bundle confirmed to call `127.0.0.1:8000`.
- Backend: **36/36 integration tests pass**.
- Frontend: strict type-check passes, production build clean.

## Still not built (unchanged from v6)
Live Razorpay popup · WhatsApp/email sending · PDF/Excel export ·
class calendar view · member self-service portal · deployment.
