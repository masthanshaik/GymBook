# Gym Management Platform — v9 (Photos, Dates, Profiles, New UI)

## New features

### 1. Webcam photo capture
- "Add Member" form has a live camera widget: Open Camera → Capture → Retake.
- Photo is center-cropped square, stored with the member, and shown as their
  avatar across the members list and profile.
- Backend: photo (base64) saved in member record; returned in all member responses.

### 2. Subscription start & end dates
- The "Assign Membership" dialog now has **Start Date** and **End Date** pickers.
- End date auto-fills based on the plan duration when you pick a start date,
  but you can override it.
- Renewals continue to track against the chosen end date.
- Backend: `started_date` / `ended_date` accepted on membership assign
  (falls back to now + plan duration if omitted).

### 3. Richer member profile
- "View" on a member opens a polished profile: photo, contact, status,
  stat cards (total paid / visits / active plans), and lists of memberships
  (with start→end dates), recent payments, and recent visits.

### 4. Modern gym UI
- New theme: dark slate (`ink`) + energetic lime-green (`energy`) + orange
  (`flame`) accents — the look gym/fitness apps use.
- Inter font, rounded 2xl cards, soft shadows, glowing active states.
- **Mobile friendly**: collapsible sidebar with hamburger + overlay, member
  list switches to cards on small screens, responsive grids throughout.
- Redesigned: sidebar, header (with avatar + logout), Dashboard (themed stat
  cards + charts), Members, Memberships, and the Login screen.

## Verified
- Backend: **44/44 tests pass** (25 core + 3 charts + 8 renewals + 8 new-feature).
- Frontend: strict type-check passes, production build clean.

## How to run (unchanged)
Backend:  `pip install -r requirements.txt` → `python3 main.py`  (port 8000)
Frontend: `cd frontend && npm install && npm run dev`  (port 3000)
DB: Postgres on 5433 (your Docker container) — `docker start gymdb` if stopped.

## Note on camera
The webcam needs a secure context — works on `http://localhost:3000`. Your
browser will ask for camera permission the first time; click Allow.
