# Gym Management Platform — v4 (Full Frontend Wiring)

Builds on v3 (all backend APIs tested 25/25). This version wires **every page**
to its backend and fixes the TypeScript build configuration.

## Newly wired pages (all use real API calls now)
- **Memberships** — view plans, create plan, assign plan to a member (with discount).
- **Payments** — record payment (cash/UPI), view per-member history, refund.
- **Classes** — create class, enroll members (capacity enforced).
- **Attendance** — check-in / check-out, live stats (today, 30-day, daily average).
- **Settings** — load & edit gym profile (name, email, phone, address).

Already done in v3: **Dashboard** (live stats) and **Members** (full CRUD + search).

## Build/config fixes in this version
- `tsconfig.json` — added `"moduleResolution": "bundler"` (was defaulting to
  `classic`, which broke JSON imports + strict type-checking).
- `src/vite-env.d.ts` — added so `import.meta.env.VITE_API_URL` is typed.
- Removed unused variables that broke the strict build (`noUnusedLocals`).
- `frontend/.env` — added, `VITE_API_URL=http://127.0.0.1:8001/api/v1`.

## IMPORTANT — port configuration
The frontend talks to the backend at the URL in `frontend/.env`.
It is set to **port 8001** because that's where you ran the backend.

- If you run the backend with `python3 main.py` (default port 8000),
  change `frontend/.env` to `http://127.0.0.1:8000/api/v1`.
- If you run on 8001 (`uvicorn main:app --port 8001`), leave it as is.

## Verified
- Backend: **25/25 integration tests pass** (re-run after changes).
- Frontend: **`tsc --noEmit` strict type-check passes** + **production build succeeds**.
- All 7 pages import and route correctly.

## How to run
Backend:
```
pip install -r requirements.txt
# edit .env: DATABASE_URL + SECRET_KEY
python3 main.py              # http://localhost:8000  (or use --port 8001)
```
Frontend:
```
cd frontend
npm install
# make sure frontend/.env VITE_API_URL matches your backend port
npm run dev                  # http://localhost:3000
```

## Still not built (planned features, not wiring)
- WhatsApp / email notifications
- PDF / Excel report export
- Dashboard charts (graphs)
- Member self-service portal
- Live Razorpay checkout popup (backend records payments; the card-entry
  popup isn't connected)
