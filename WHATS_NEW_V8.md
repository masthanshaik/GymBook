# Gym Management Platform — v8 (Install fix)

Fixes the `pip install` failure on Python 3.13 + the database connection error.

## What changed

### Slimmed requirements.txt
The old file pinned `pillow==10.1.0` and other packages (celery, redis,
sendgrid, twilio, boto3, etc.) that the app **does not import**. Pillow 10.1.0
fails to build on Python 3.13 (`KeyError: '__version__'`), which broke the whole
install. The new requirements.txt contains **only the packages the code actually
uses**, with version ranges that work on Python 3.13:
fastapi, uvicorn, sqlalchemy, psycopg2-binary, python-jose, passlib, bcrypt,
pydantic[email], pydantic-settings, razorpay, requests, httpx.

Verified: installs cleanly in a fresh venv, all imports resolve, 25/25 tests pass.

### Database
Your `.env` points at PostgreSQL on `localhost:5433`. That connection was
refused because no Postgres was running on that port. See run steps below.

## How to run (Mac)

1. Backend deps (use a venv):
```
cd gym_platform_final
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

2. Start PostgreSQL on port 5433 (matches .env). Easiest is Docker:
```
docker run --name gymdb -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=gymbook_db -p 5433:5432 -d postgres:15
```
   (If you prefer Homebrew Postgres on the default 5432, instead change the
   .env line to: DATABASE_URL=postgresql://YOURUSER@localhost:5432/gymbook_db)

3. Run the backend:
```
python3 main.py            # http://localhost:8000
```

4. Frontend (new terminal):
```
cd frontend
npm install
npm run dev                # http://localhost:3000
```

## Note: pip vs pip3
Outside a venv your Mac only has `pip3`. Inside the venv (after
`source venv/bin/activate`) plain `pip` and `python` work.
