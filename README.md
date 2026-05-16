# Florière

Flower-gifting mobile app for Bangkok. Course project, App Development Year 2 Semester 2, Chula. **Phase 2 — MVP build.**

> Locked stack from the Phase 1 deck: **React Native + TypeScript + Expo** (mobile & web, same codebase) · **Python + Flask** REST API · **MySQL** for data and auth. No Firebase. No Supabase. See [`docs/GENESIS.md`](docs/GENESIS.md) for the full product spec and brand.

## Three roles, one codebase

| Role | What they do |
|---|---|
| `purchaser` | Run the Concierge quiz, browse 12 curated collections, use Intent Mode, place orders (scheduled or urgent), track delivery |
| `seller` | Manage their flower stems, see incoming orders, advance order status through fulfilment |
| `admin` | Platform-wide metrics, all users, all orders, override status |

## Run it locally

You need: **Python 3.10+**, **MySQL 8** running locally, **Node 20+**.

### 1. Database

```bash
# Create the DB user / set the password in db.py, or set the FLORIERE_DB_* env vars.
# Default credentials: user=root, password=floriere123, db=floriere.

cd backend
python3 -m venv venv
source venv/bin/activate      # macOS / Linux
# .\venv\Scripts\Activate.ps1  # Windows PowerShell

pip install -r requirements.txt

# Apply schema, seed the demo data, hash the demo passwords.
python scripts/init_db.py
```

If you change your MySQL password, override with env vars:

```bash
export FLORIERE_DB_HOST=127.0.0.1
export FLORIERE_DB_USER=root
export FLORIERE_DB_PASSWORD=your-password
export FLORIERE_DB_NAME=floriere
```

### 2. Backend (Flask API on :5000)

```bash
cd backend
source venv/bin/activate
python app.py
# → http://127.0.0.1:5000/health
```

### 3. Frontend (Expo — mobile native + web)

```bash
cd frontend/floriere-app
npm install
npm run web          # browser at http://localhost:8081
# or
npm start            # then press 'i' for iOS, 'a' for Android, 'w' for web
```

If you're on an Android emulator, the backend is reached at `http://10.0.2.2:5000` (handled automatically in `lib/config.ts`).
If you're on a physical phone over Expo Go, set `EXPO_PUBLIC_API_URL=http://<your-laptop-LAN-IP>:5000` before `npm start`.

## Demo accounts

The seed creates three users so you can see every role end-to-end without registration:

| Role | Email | Password |
|---|---|---|
| Purchaser | `pete@floriere.test`     | `purchaser123` |
| Seller    | `merchant@floriere.test` | `merchant123` |
| Admin     | `@floriere.admintest`    | `admin123` |

You can also register a new purchaser (or new seller — toggle "I'm signing up as a flower merchant" on the register screen). Admins are seed-only.

## What's in the demo (matches Phase 1 deck Slide 10)

| # | Feature | Where in the app |
|---|---|---|
| 01 | Concierge quiz (Spotify-style guided: occasion → mood → palette → flowers → message → AI preview) — replaces deck's DIY canvas, see `docs/GENESIS.md` §Phase 2 scope expansion | `/(purchaser)/compose` |
| 02 | Curated Collections (12 occasion-led bouquets, search + sort + ratings) | `/(purchaser)/curated` |
| 03 | Intent Mode (occasion + recipient → suggestion + card message) | `/(purchaser)/intent` |
| 04 | Dual-mode Delivery — **Scheduled** (1-hour slots `09:00–10:00 … 20:00–21:00`) or **Urgent** (today, ASAP 1–2h, +฿150 rush) + address + recipient + phone + card + voucher | `/(purchaser)/checkout` |
| 05 | Account & Orders (auth, order list + tracker + timeline + chat + ratings + reorder) | `/(auth)/*`, `/(purchaser)/orders` |
| 06 | Brand Presentation (Florière packaging copy on every detail) | every screen |

### Pass 2 depth (added 2026-05-11 — full breakdown in [`docs/FEATURE_AUDIT.md`](docs/FEATURE_AUDIT.md))

| Feature | Where |
|---|---|
| Live order timeline with timestamps | purchaser + seller order detail |
| Per-order chat (three-way: purchaser ⇄ seller ⇄ admin) | order detail |
| Cancellation request flow (after seller accepts) | order detail (both sides) |
| ETA window when out_for_delivery | purchaser order detail header |
| 5-star ratings after delivered + recent reviews | purchaser order detail, curated detail |
| Reorder (one-tap clone past order to cart) | purchaser order detail |
| Address book + saved recipients + favorites | `/(purchaser)/account`, `/(purchaser)/favorites` |
| Voucher codes (`WELCOME10`, `STUDIO200`, `GRADER25`) | checkout |
| In-app notifications inbox (bell + dot + full screen) | `/notifications` |
| Shop open/close + hours | seller home, surfaced on purchaser home |
| Low-stock alerts | seller home |
| Search + sort + filter | curated index |
| Voucher admin CRUD | `/(admin)/vouchers` |
| Order filter (incl. cancel-request) | `/(admin)/orders` |

### Pass 3 — mocked "out-of-scope" UI (added 2026-05-11)

We kept the locked stack and the Slide-9 invariants (no real Maps SDK, no
real payment gateway, no real push notifications), but built the UI surface
for each one as a believable mock so the demo reads as a complete delivery app.

| Feature | Where it lives in the app |
|---|---|
| Live delivery map (stylised SVG, courier dot animates along the route) | purchaser order detail when status = `out_for_delivery` |
| Mock courier contact (Call modal + Message thread, scripted replies) | purchaser order detail; seller-side gets "Call recipient"; purchaser-side gets "Call the studio" |
| Delivery photo (seller picks 1 of 4 preset Unsplash URLs on delivered) | purchaser order detail card; seller picker on `delivered` |
| Tip the courier (chips `฿20 / ฿50 / ฿100 / Custom` + note) | purchaser order detail after `delivered` |
| Mock push notifications (top-of-viewport toast on new unread) | `<NotifToast />` mounted in `app/_layout.tsx` |
| Seller tips-this-week KPI | seller home |
| Platform courier-tips KPI | admin home |

The demo seed creates **order #1001** already in `out_for_delivery` with a
courier assigned (Khun Nat, +66 89 555 0142, `dispatched_at = now - 4 min`).
Log in as `pete@floriere.test`, open Orders, tap that order — every Pass-3
feature is on screen.

### Pass 6 — Concierge + dual delivery + brief-review (added 2026-05-15/16)

Strict supersets of the Phase 1 deck. Full rationale in [`docs/GENESIS.md` §Phase 2 scope expansion](docs/GENESIS.md#phase-2-scope-expansion-shipped-after-phase-1-deck-was-accepted).

| Feature | Where |
|---|---|
| Concierge quiz (7 steps: occasion → mood ×3 → palette → flowers → message → anything-else → AI preview) | `/(purchaser)/compose` (tab labelled **Concierge**) |
| AI image generation — Gemini 2.5 Flash Image (Nano Banana) → Pollinations.ai fallback → tag-similarity stub | backend `routes/concierge.py`; key in `backend/.env` (gitignored) |
| Brief-review loop — merchant Accept / Ask / Decline; customer Confirm | seller + purchaser order detail when `concierge_brief` present |
| Dual delivery modes — Scheduled (1-hour slots) or Urgent (today ASAP + ฿150) | checkout |
| Concierge brief panel — full quiz output rendered on order detail (preview + summary + format/palette/stems pills + message + anything-else notes) | purchaser + seller order detail |
| RUSH·TODAY pill | seller order detail when `delivery_mode = urgent` |
| Demo concierge order **#1003** in `pending_review` | log in as `merchant@floriere.test` |

Order lifecycle (per deck Slide 9 — *Cart → Place → Store → Track*): purchaser cart → checkout → seller advances `pending → accepted → preparing → out_for_delivery → delivered`; admin can override any status. Purchaser may cancel while still pending, or **request** cancellation after the seller accepts (seller / admin approves or denies).

**Concierge orders** add an extra leg: they enter `pending_review` (not `pending`) so the merchant can read the brief. The merchant can **Accept** (→ `accepted`), **Ask** (posts a question to chat → `awaiting_customer`), or **Decline** (→ `cancelled`). On `awaiting_customer` the purchaser sees a "Florist has a question" card with a **Confirm** button that flips status back to `pending_review`.

## Adaptive UI

One component tree, three breakpoints (`phone` < 640 < `tablet` < 1024 < `desktop`). On desktop web, content is centered in a phone-shaped frame so the native feel doesn't sprawl. Adjust `widths` in `frontend/floriere-app/theme/spacing.ts` to tune.

## Out of scope (no real external services — UI-only / mocked)

Per Phase 1 deck Slide 9 we don't wire in real third-party services. Pass 3
filled in the UI for each excluded item so the demo reads as complete; the
underlying behaviour is **mocked**:

- **Real payment gateway** — checkout shows a demo "VISA •••• 1839" card; the courier tip records intent only.
- **Real delivery dispatch** — the seller still drives status manually; "courier" is a name picked from a small list and the map dot is a stylised SVG, not a real GPS feed.
- **Push notifications** — `NotifToast` is poll-driven (every 8s), not real APNs/FCM.
- **Camera / photo upload** — delivery photo is picked from 4 preset URLs.
- **Production deploy** — local Flask + Expo dev only.
- **Multi-merchant split fulfilment** — single V1 merchant by design.

## What to show in the 5–7 minute video

Suggested take, end-to-end (updated for Pass 2 + Pass 3 — see also `docs/FEATURE_AUDIT.md` §13):

1. **Landing** — read the brand statement, point out single-accent editorial layout
2. **Register** a new purchaser (or log in as `pete@`)
3. **Curated** → use the search box / sort chips → open a bouquet → tap the heart to save → add to cart. (Note the star rating + review count on the cards.)
4. **Concierge quiz** → pick occasion (try `anniversary` or free-text `Other`) → pick 3 moods → pick palette → optionally pick flowers → write a message → add an "anything else for the florist" note → tap **Generate** → see live AI preview → add to cart. (Source badge shows `gemini` / `pollinations` / `stub`.)
5. **Intent Mode** → pick "anniversary" → "Suggest a bouquet" → add to cart
6. **Cart** → review items → **Checkout** → choose **Scheduled** (exact 1-hour slot like `14:00–15:00`) **or Urgent** (today ASAP, +฿150) → tap saved address/recipient → **apply voucher `GRADER25`** → see live discount → place. Concierge order lands in `pending_review` for the florist.
7. **Open order #1001 (pre-seeded `out_for_delivery`)** — show the **live SVG map** with the moving courier dot, the ETA counting down, then the **Courier en route** card. Tap **Call** → mock call modal. Tap **Message** → chat with the courier (the scripted reply lands).
8. **Standard tracker + timeline + studio chat** are right below the map — send "Please leave at reception" in the studio thread.
9. **Sign out → log in as `merchant@`** → seller home: shop OPEN/CLOSED toggle, **Tips this week KPI**, low-stock card. Open **order #1003** (pre-seeded concierge brief in `pending_review`) → read the brief panel → tap **Accept** → status flips to `accepted`. Then open order #1001 → tap **Call recipient** → mock modal → close. Advance to **delivered**, then pick a delivery photo from the **4 preset thumbnails**.
10. **Back to purchaser** → order #1001 now shows the **delivery photo** card with "Left at reception · by Khun Nat". Send a **tip** (try `฿50`), see the confirmation.
11. **Leave a 5-star rating**, then tap **"Order this again"** to clone the items into the cart.
12. **Request cancellation** on a different in-flight order → flip to seller → approve → see the timeline write.
13. **Sign out → log in as `admin@`** → metrics dashboard with **avg rating + courier tips KPI + pending cancel requests**, then `/admin/orders` filtered by `CANCEL REQ`, then `/admin/vouchers` to show the voucher CRUD.
14. **Mid-demo, change something as merchant** so a notification fires on the purchaser side — show the **`NotifToast` slide in** from the top, tap it to deep-link.
15. Closing line: *"Florière — every bloom, intended."*

## Repo layout

```text
backend/
  app.py              Flask factory + CORS + blueprint registration
  auth.py             token-based session middleware
  db.py               MySQL connection pool (env-driven)
  schema.sql          authoritative DDL
  seed.sql            demo data (1 merchant, 43 stems / 21 unique kinds, 12 curated, 3 demo users, demo concierge order #1003 in pending_review)
  routes/
    auth.py           register, login, logout, /me
    catalog.py        list flowers, curated bouquets (search/sort/filter), Intent Mode
    cart.py           purchaser cart CRUD
    orders.py         checkout, list, status, events, messages, ratings, cancel-request, reorder
    seller.py         own merchant (incl. is_open / hours), flower CRUD, low-stock, ratings, public profile
    admin.py          all users, metrics (incl. avg rating + cancel-req count), role changes, voucher CRUD
    account.py        purchaser addresses, recipients, favorites, voucher preview
    notifications.py  in-app inbox + unread count + mark-read
  scripts/init_db.py  one-shot DB bootstrap + password rehash
  requirements.txt

frontend/floriere-app/
  app/                Expo Router file-based routes
    _layout.tsx       root provider + role-aware navigation gate (allows shared /notifications)
    index.tsx         landing
    notifications.tsx in-app inbox (shared across roles)
    (auth)/           login, register
    (purchaser)/      home, compose, curated, intent, cart, checkout, orders, account, favorites
    (seller)/         home, orders/[id], catalog
    (admin)/          home, users, orders, vouchers
  components/         Screen, Button, Field, Card, Pill, Text, StatusBadge, AppHeader, BrandMark,
                      FlowerArt, Stars, OrderTimeline, MessageThread, NotifBell
  lib/                api client, auth context, session storage, types, format (incl. relative time
                      + stars + etaSummary), responsive
  theme/              colors, typography, spacing — single source of truth
  app.json            Expo config

docs/GENESIS.md       why Florière exists + brand + locked product invariants
PLAN.md               Phase 2 build plan (the path through this codebase)
TASKS.md              session scratchpad
```

## Phase 1 artefacts (NOT in this repo)

The Phase 1 pitch deck and 4-minute video script live in the vault:

```
C:\Users\petek\Workspace\50-Outside\uni-chula\year2\semester2\appdev\project\
  Floriere_Proposal.pdf       — the deck submitted on 2026-04-26
  Floriere_VDO_Script.docx    — the original 4-min video script
  HANDOFF.md                  — the full session context that produced both
```

## Phase 2 submission (deadline 2026-05-18 23:59)

1. Presentation PDF (compare-to-proposal)
2. YouTube link to the 5–7 minute walkthrough video
