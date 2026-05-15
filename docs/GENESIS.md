# Genesis — why Florière exists

Single source of truth for "why this product exists, what it is, and what's locked." Synthesized from the Phase 1 ideation + the pitch deck that was accepted on 2026-04-26. **Don't auto-update this file.** Edit intentionally when the founder direction changes.

## The problem (verbatim from founding session — paraphrased)

Sending flowers in Thailand is broken in three ways:

1. **Templates, not intentions.** Existing platforms ship preset bouquets. The person picking up the phone to send flowers is in an emotional moment — they want to *say something*, and the products don't help them do that.
2. **Deliveries that fail the moment.** Today's options are either drive to a flower market yourself, or order from an IG store and wait 1–2 days with the bouquet bruising on arrival. Neither is reliable for a same-day gift with emotional weight.
3. **No brand, no trust.** "Flowers" don't have brands the way jewelry does. There's no Tiffany of flowers. The recipient unpacks a paper-wrapped commodity, not an experience.

Bangkok consumer market also shows ~2.7× Valentine's markup and <5% brand-led recall (cited in deck Slide 3).

## The product (LOCKED — concept invariants)

- A platform / mobile app that also runs in the browser
- Users **compose / decorate** their bouquet (DIY canvas)
- Connects users to vetted flower-merchant partners (**V1: single merchant** — multi-merchant is V2 because split-fulfillment isn't solved)
- Delivers to a specified location and time
- Flat consumer pricing across seasons; platform absorbs volatility on the merchant side (V2 — V1 is flat margin)
- Branded gift experience — "jewelry brand for flowers" positioning; exclusive
- Recipient feels something. Emotional gifting is the entire point.

What V1 is NOT:
- Subscriptions
- B2B / event florals
- AR preview
- Multi-merchant split fulfillment

## Brand

| Token | Value | Use |
|---|---|---|
| `cream` | `#F4EEE6` | Primary light background |
| `creamSoft` | `#FAF7F2` | Secondary light surface |
| `charcoal` | `#1C1A17` | Primary dark background, body text on cream |
| `charcoalSoft` | `#2A2622` | Secondary dark surface |
| `champagne` | `#B8945D` | Primary accent (single accent per screen) |
| `champagneSoft` | `#D8B988` | Accent hover / softer accent |
| `plum` | `#3D2C4E` | Secondary dark — used on rhythm slides 5/10/13 of deck |
| `plumSoft` | `#5A4470` | Plum hover / softer plum |
| `ink` | `#3A332D` | Body text on cream backgrounds |
| `muted` | `#8B7F73` | Captions, subtitle text, meta |

Type:
- **Headlines / display:** Georgia (web), Times New Roman / system serif (native fallback). Editorial serif.
- **Body / UI:** Segoe UI on Windows web, system-ui sans on native. Calm, neutral.

Vibe: editorial magazine layout. Generous whitespace. **Single accent color per screen.** No emoji bullets in product UI. No gradient backgrounds. No dense walls of text.

## Tech stack (LOCKED — pitched in Phase 1)

- **Mobile + web:** React Native + TypeScript + Expo. Expo Router for file-based routing. `react-native-web` for browser parity from the same component tree.
- **Backend:** Python + Flask. REST JSON. CORS enabled for the dev web origin.
- **Database:** MySQL. SQLAlchemy NOT required — friend's V1 used `mysql-connector-python` directly, fine to keep.
- **Auth:** Email + password. bcrypt password hash. Server-side session tokens in a `sessions` table. Frontend stores the token via `expo-secure-store` (native) / `localStorage` (web fallback). **No Firebase. No Supabase. No third-party identity service.**

The stack stays because the prof has it on record and "tech stack matches proposal" is part of the 15% completeness grade.

## Three user roles

| Role | What they do | Example creds (set in seed) |
|---|---|---|
| `purchaser` | Browse curated, compose custom bouquets, use Intent Mode, place orders, track delivery | `pete@floriere.test` / `purchaser123` |
| `seller` | One merchant per V1. Manages their flower catalog. Views incoming orders. Updates order status (`accepted → preparing → out_for_delivery → delivered`). | `merchant@floriere.test` / `merchant123` |
| `admin` | Full platform view: all users, all orders, force-set order status, view metrics | `admin@floriere.test` / `admin123` |

Role is stored on the `users` row and enforced server-side on every protected endpoint.

## Features in scope

From Phase 1 deck Slide 10 (the "06 Features & Functionalities" panel). **These are the features the grader will check against the deck.**

1. **DIY Studio** — flower-stem canvas: pick stems, add quantities, name your bouquet.
2. **Curated Collections** — pre-composed bouquets by occasion (anniversary / apology / celebration etc.).
3. **Intent Mode** — input occasion + recipient + tone, get a suggested bouquet + a suggested message card. For V1 the suggestion engine is rule-based on occasion (no LLM call).
4. **Scheduled Delivery** — pick delivery date, address, recipient name, gift message. Bangkok metro only (V1 limitation, on deck).
5. **Account & Orders** — email/password auth via Flask; view your past orders + current order status.
6. **Brand Presentation** — every screen, every order confirmation, every status email carries Florière brand. Editorial UI, serif headlines, single accent.

Out of scope (UI-only or excluded per Phase 1 deck Slide 9):
- Real payment gateway (UI placeholder accepted)
- Real delivery dispatch (status updates are manual via seller/admin)
- Push notifications (in-app status changes only)
- Production deploy

## Order lifecycle (per deck Slide 9)

`Cart → Place → Store → Track` — end-to-end.

Statuses: `pending → accepted → preparing → out_for_delivery → delivered`. Plus `cancelled` (admin or seller can set).

- Purchaser: places order from cart, sees status update.
- Seller: accepts pending orders, updates status as they fulfill.
- Admin: can override any status, can cancel any order.

## Phase 2 scope expansion (shipped after Phase 1 deck was accepted)

Phase 1 deck pitched DIY canvas + curated + Intent Mode + scheduled delivery. During Phase 2 build, four expansions shipped that go **beyond** that deck — they're additive (every original deck feature still works) and address gaps the deck couldn't anticipate. Documented here so the grader can trace what's new.

### 1. Concierge quiz (replaces DIY canvas)

The deck's "DIY Studio" was a stem-by-stem canvas — pick rose × 6, peony × 3, drag, name it. In practice that asks the purchaser to design a bouquet they don't know how to design. **Concierge** replaces it with a Spotify-style guided quiz:

1. Occasion (14 presets + free-text "Other")
2. Mood — pick 3 from 20 visual references (e.g. *jasmine garland*, *blush peony*, *midnight velvet*)
3. Palette — pick 1 from 18 (e.g. blush, ivory, ember, sage, midnight)
4. Optional flower preferences (43 stems / 21 unique kinds)
5. Message + card-vs-tag format
6. "Anything else for the florist" free-text
7. Live AI preview — Gemini 2.5 Flash Image (Nano Banana) → Pollinations.ai fallback → tag-similarity stub

The brief is persisted as JSON on `cart_items.concierge_brief` and copied to `orders.concierge_brief` at checkout. The merchant sees the full brief on the order detail page.

### 2. Brief-review loop (merchant ↔ customer)

Concierge orders enter status `pending_review` (not `pending`). The merchant has three actions on the order detail:

- **Accept** → flips to `accepted`, normal fulfillment proceeds.
- **Ask** → posts a question to the order chat thread, flips status to `awaiting_customer`. The purchaser sees a "Florist has a question" card with a Confirm button.
- **Decline** → cancels the order with a reason.

The purchaser's **Confirm** flips status back to `pending_review` for the merchant to re-check. Status enum extended with `pending_review` + `awaiting_customer`. Four new endpoints (`concierge_accept`, `concierge_ask`, `concierge_decline`, `concierge_confirm`).

### 3. Dual delivery modes

The deck's "Scheduled Delivery" has only one mode and the time windows were broad (Morning / Afternoon / Evening). Phase 2 splits this into two:

- **Scheduled** — exact 1-hour slots `09:00–10:00 … 20:00–21:00`. For orders placed 1+ days ahead.
- **Urgent** — today, ASAP (1–2h). **+฿150 rush surcharge.** For the actual core use case (need flowers *now* for a moment that's happening *now*).

`orders.delivery_mode` enum stores the choice; merchant order detail shows a `RUSH · TODAY` pill on urgent orders.

### 4. Expanded curated catalog

Deck Slide 10 implied 4 occasion buckets. Phase 2 ships **12 curated bouquets across 11 occasions** (added: birthday, thank_you, get_well, graduation, wedding, newborn, housewarming + a second celebration option *Bangkok Bloom* using Pak Khlong Talat market flowers — marigold, jasmine, bougainvillea). The 43-stem catalog (21 unique kinds) backs every composition.

### Why this matters for grading

These expansions are **strict supersets** of the deck. Every Phase 1 promise still works — Intent Mode still routes occasions to bouquets, scheduled delivery is still scheduled delivery. Concierge replaces DIY canvas because the canvas was the weakest part of the deck (asks too much of the user). The brief-review loop and dual delivery modes solve the "deliveries that fail the moment" problem named in §The problem above — which the deck identified but didn't fully solve.

## What this file is NOT

- Not a changelog. Recent changes live in git.
- Not a plan. The active build plan is `PLAN.md`.
- Not a status board. Status is "look at what compiles + look at TASKS.md."
- Not the deck. The deck is at `Workspace/50-Outside/uni-chula/year2/semester2/appdev/project/Floriere_Proposal.pdf`.
