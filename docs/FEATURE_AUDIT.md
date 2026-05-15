# Florière — Feature audit (Phase 2)

**Generated:** 2026-05-11 · for the 2026-05-18 submission
**Reference deck:** `Workspace/50-Outside/uni-chula/year2/semester2/appdev/project/Floriere_Proposal.pdf`
**Scoring:** Functionality 15% · Quality/Difficulty 5% · UX/UI 3% · Presentation 2%

> **Update 2026-05-11 (Pass 3):** Pete reversed the Slide-9 exclusions for the
> demo. Real payment gateway, real delivery dispatch, push notifications, and
> camera/photo upload still don't get wired to a real external service — but
> we now build the UI for each as a **believable mock**. Items below marked
> `out of scope — <citation>` were either rebuilt as Pass-3 mocks (✅ now
> mocked in Pass 3, see code path) or remain genuinely out of scope.

This document is a deep, honest comparison: every feature a competitive flower-delivery or
3-role marketplace app has, against what Florière actually ships today.

Marker key:
- `done` — built, demonstrable in the video
- `partial — <missing>` — partly built; what's left
- `missing` — not built
- `out of scope — <citation>` — deliberately excluded per the deck or concept invariants

---

## 1 · Browsing & discovery

| Feature | What it does in Grab Food / DoorDash / Bloom & Wild / Floom | Status in Florière |
|---|---|---|
| **Curated category browse** | Pre-built rails by occasion / cuisine. Hero card → list → detail. The "lookbook" entry point for taste-led shoppers who don't yet know what they want. | done — `app/(purchaser)/curated/` |
| **Search bar** | Keyword filter over the catalog. In Grab it filters by name; in Bloom & Wild it also matches by mood. Becomes essential once SKU count grows. | done — query param `?q=` on `/catalog/curated`, with a search Field on the index page |
| **Sort** | Sort by price ↑/↓, rating, newest. Standard marketplace control — sells "this is a real catalog." | done — `?sort=price_asc|price_desc|rating|newest` |
| **Filter by occasion** | Multi-select chips. | done — pill chips on the curated list |
| **Filter by price band** | "Under ฿1,000 / 1–2k / 2k+". Not heavily used in flowers; the catalog isn't that deep yet. | missing — `SKIP` (low ROI; sort solves it for the demo) |
| **Filter by color / flower type** | Bloom & Wild has these. Real differentiator once catalog is large. | missing — `SKIP` (V1 catalog is 4 curated × 1 merchant) |
| **Favorites / wishlist** | "Heart" on a product saves it for later. Visible in apps as a tab. | done — `favorites` table, `account/favorites` endpoints, `(purchaser)/favorites.tsx`, heart pill on curated detail |
| **Recently viewed** | Auto-tracked. Big in fashion/jewelry apps. | missing — `SKIP` (favorites covers the same intent for the demo) |
| **Recommendations / "you might also like"** | Cross-sell engine. | missing — `SKIP` (V1 has 4 curated bouquets, would feel forced) |
| **DIY composition** | "Build your own" — pick parts, see total. Differentiator the deck pitches as `01`. | done — `(purchaser)/compose.tsx` |
| **Intent-driven suggestion** | Tell the app the moment, get a recommendation. Florière's `03` on the deck — rule-based for V1. | done — `(purchaser)/intent.tsx` + `/catalog/intent` |

## 2 · Product detail

| Feature | What it does elsewhere | Status |
|---|---|---|
| **Hero photography + description** | The minimum any product page has. | done |
| **Composition transparency** | "What's in this bouquet" — Floom shows stem counts. Floward shows the studio's process. Florière already exposes the full stem list per curated bouquet. | done — `/catalog/curated/<id>.flowers[]` |
| **Reviews + average rating** | Star aggregate + most recent reviews. Massively persuasive. | done — `order_ratings` table, aggregates on curated detail + index card |
| **Q&A on product** | Less common in flower apps; common on Amazon. | missing — `SKIP` (chat per order covers ad-hoc questions) |
| **"Add to favorites" inline** | Heart on the detail page itself. | done |
| **Inventory / scarcity** | "Only 3 left today" — peony seasonality is a real thing. | partial — sellers see `low_stock`; not surfaced to purchasers. `SKIP` for purchaser side (the merchant can adjust stock manually) |

## 3 · Cart, checkout, payment

| Feature | What it does | Status |
|---|---|---|
| **Persistent cart** | Server-side cart so it survives device switching. | done — `carts` table |
| **Remove item / change qty** | | done (remove); qty is fixed at 1 per item by design (each "item" is a bouquet) |
| **Address book — saved addresses** | One-tap reuse. Default address. | done — `addresses` table, `/account/addresses` endpoints, `(purchaser)/account.tsx` |
| **Saved recipients** | "Send to Mali" reused across orders. | done — `recipients` table, `/account/recipients` endpoints |
| **Delivery time window** | Morning / Afternoon / Evening slots. Grab Food doesn't have it; Bloom & Wild does ("send before 12pm"). | done — `delivery_window` on orders, chip selector on checkout |
| **Delivery date** | Required for scheduled gifting. | done — `delivery_date` field |
| **Recipient phone** | Carrier calls the recipient before delivery. Standard in BKK delivery apps. | done — new `recipient_phone` column |
| **Card / gift message** | The whole point of a flower-gifting app. | done — `recipient_message` on orders |
| **Voucher / promo code** | Apply a code at checkout. Big visible win for the demo. | done — `vouchers` table, `/account/voucher/preview` endpoint, voucher block on checkout, `(admin)/vouchers.tsx` to manage them. Seed includes `WELCOME10`, `STUDIO200`, `GRADER25`. |
| **Subtotal / discount / total breakdown** | | done — broken down on checkout + order detail |
| **Payment selection (card / wallet)** | | partial — `out of scope` per deck Slide 9 ("real payment gateway excluded"). UI shows demo VISA placeholder. |
| **Save payment method** | | `out of scope` — deck Slide 9 |
| **Tip the courier** | Lalamove / Grab pattern. | ~~`out of scope` — deck Slide 9 (no dispatch)~~ ✅ **now mocked in Pass 3** — chip choices `฿20 / ฿50 / ฿100 / Custom` + optional note, `POST /orders/<id>/tip` records the intent (no real payment). See `components/TipCard.tsx` + `routes/orders.py::tip_courier`. |
| **Same-day toggle** | Cutoff time copy. | done (copy) — "same-day before 2pm" surfaced on landing + home |

## 4 · Order lifecycle (Pete's specific ask — "is there status like Grab Food, preparing the order, on delivery…")

| Feature | What it does | Status |
|---|---|---|
| **Status pipeline** | `pending → accepted → preparing → out_for_delivery → delivered` (+ `cancelled`). Five visible stages. | done — enforced at the server with role rules |
| **Visual stage tracker** | Grab Food's 4-dot tracker. Florière's editorial version: cream dots → champagne dots. | done — purchaser order detail |
| **Status timestamps / event log** | Grab Food shows "Accepted 14:02 · Preparing 14:08 · Out for delivery 14:24". This is the single biggest "real app" cue. | done — append-only `order_events` table, `/orders/<id>/events`, `OrderTimeline` component rendered in both purchaser + seller order detail |
| **Live ETA window** | "Arriving by 6:30pm." | done — `etaSummary()` for the header line + ✅ **live counting-down ETA in Pass 3** when the courier is dispatched (`/orders/<id>/courier` returns `remaining_minutes`). |
| **Push notification on status change** | The Grab Food vibration. | ~~`out of scope` — deck Slide 9 excludes push notifications~~ ✅ **now mocked in Pass 3** — `components/NotifToast.tsx` slides a banner in from the top when the unread count goes up. It's still polling, not real APNs/FCM — but it reads as a real push for the demo. Mounted in `app/_layout.tsx`. |
| **In-app notifications inbox** | The bell icon you tap to see "Order #14 is preparing." | done — `notifications` table, `/notifications` endpoints, `NotifBell` in header, `app/notifications.tsx` screen |
| **Cancel while pending** | Purchaser cancels before merchant accepts. | done (pre-existing) — direct cancel button |
| **Cancellation REQUEST after accepted** | After the merchant accepts, purchaser can no longer hard-cancel — they must request, and the merchant approves or denies. This is the Grab Food / DoorDash pattern. | done — `cancel_request` enum on orders, `cancel_reason` text, `/orders/<id>/cancel_request` (purchaser), `/orders/<id>/cancel_response` (seller / admin), purchaser sees pending-request banner, seller sees red banner with approve/deny |
| **Admin force-cancel** | Customer support override. | done (pre-existing) — admin can override to any status |
| **Reorder ("send this again")** | One-tap clone of past order into cart. Huge in food apps. Especially makes sense for a gift app — "send Mali flowers again." | done — `/orders/<id>/reorder` clones items into the cart |
| **Live order chat** | Three-way (purchaser, seller, admin) chat scoped to one order. Grab Food has "chat with rider." Bloom & Wild has "message the studio." | done — `order_messages` table, `/orders/<id>/messages` (GET/POST), `MessageThread` component rendered in both purchaser + seller order detail with bubble UI. Read-receipts via `read_at`. |
| **Rate the delivery** | 5 stars + optional comment, after delivered. Powers reviews on product detail. | done — `order_ratings` table, `/orders/<id>/rating`, Stars input on purchaser order detail when status = `delivered` |
| **Refund / partial refund** | Money-back flow. | `out of scope` — no real payments, so no real refunds. The "cancel = refunded" UI copy is enough. |
| **Re-route / change address mid-flight** | DoorDash supports it (with limits). | missing — `SKIP` (low ROI for the demo; would need delivery dispatch to make sense) |
| **Schedule for future date** | | done — `delivery_date` is a future-date field |
| **Recurring / subscription delivery** | Bloom & Wild's main product. | `out of scope` — deck Slide 9 ("no subscriptions") + concept invariants in GENESIS.md |

## 5 · Communication

| Feature | What it does | Status |
|---|---|---|
| **Per-order chat thread** | See "Live order chat" above. | done |
| **Quick-reply templates for sellers** | "On the way!" / "Slight delay." | missing — `SKIP` (free-text message thread covers it) |
| **Direct call to recipient** | Click-to-call link. | ✅ **mocked in Pass 3** — `CallModal` opens a stylised "Ringing…" modal (no real `tel:` URL — we don't launch the OS dialer). Wired into seller order detail (Call recipient), purchaser order detail (Call the studio + Call courier). |
| **Read receipts** | Bubble-level "seen". | done — `read_at` on `order_messages`, set when viewer opens the thread |
| **Notification bell** | See above. | done |
| **Email confirmation** | "Your order is confirmed." | missing — `SKIP` (would need email infra; in-app inbox covers it for the demo) |

## 6 · Trust & social proof

| Feature | What it does | Status |
|---|---|---|
| **Merchant rating aggregate** | "4.6 ★ (132)" on the merchant tile. | done — surfaced on purchaser home (the shop card) + seller home (own dashboard) + admin home (platform avg) |
| **Product (bouquet) rating aggregate** | Stars on the curated tile + detail. | done — `avg_stars` + `review_count` returned by `/catalog/curated` |
| **Most-recent reviews on product detail** | Quote-style. | done — `/catalog/curated/<id>` returns latest 10 reviews with comment |
| **Verified-buyer badge** | Inferred from "review row joined to delivered order." | partial — only purchasers who completed `delivered` orders can rate (server-enforced); not surfaced as a badge in the UI to keep the editorial vibe |
| **Shop open / closed indicator** | "Open · 09:00–21:00" / "Closed — scheduled only." | done — `is_open`, `open_hour`, `close_hour` on `merchants`; toggle on seller home; status badge on purchaser home |

## 7 · Merchant / seller surface

| Feature | What it does | Status |
|---|---|---|
| **Incoming orders queue** | Real-time list. | done (pre-existing) |
| **Order detail with status advance** | | done (pre-existing) — extended with cancel-request approve/deny, message thread, timeline |
| **Catalog / inventory CRUD** | Stem-level add / edit / disable. | done (pre-existing) |
| **Stock tracking** | | partial — `stock` column on flowers; decrement-on-order is `SKIP` (would require careful concurrency, and the demo is single-merchant). Surfaced as `low_stock` on the seller home instead. |
| **Low-stock alerts** | "Peony is at 3 stems." | done — `/seller/low_stock`, banner on seller home |
| **Working hours / open-close toggle** | "We're closed." | done — `is_open` on merchants, toggle on seller home |
| **Shop profile (description, hero)** | | done — `description` editable on `/seller/me`. Image not added — `SKIP` to keep brand consistency (single-merchant V1 doesn't need a hero photo). |
| **Earnings / payout view** | "You've made ฿15,200 this week." | partial — admin metrics show platform revenue; per-merchant payout view is `SKIP` for V1 (single merchant; admin metrics tells the same story) |
| **Ratings dashboard** | List of recent ratings + average. | done — `/seller/ratings`, recent ratings rendered on seller home |
| **Daily order cap** | "Stop accepting at 10 per day." | missing — `SKIP` (covered by the open-close toggle for V1) |
| **Holiday pricing schedule** | Valentine's 2.7× problem cited in deck Slide 3 — but that's V2 territory ("platform absorbs volatility"). | `out of scope` — concept invariant: flat consumer pricing in V1 |

## 8 · Admin / platform

| Feature | What it does | Status |
|---|---|---|
| **Platform metrics** | Total users, orders, revenue, by-status pipeline. | done (pre-existing) |
| **Avg platform rating** | | done — added to `/admin/metrics` |
| **Open cancel-request count** | | done — added to `/admin/metrics`, shown as alert card on admin home |
| **User list + role override** | | done (pre-existing) |
| **Order list with force-status** | | done (pre-existing), extended with cancel-request filter |
| **Order filter / search** | Filter the all-orders view. | done — chip filters (all / cancel-req / each status) |
| **Voucher / promo administration** | Create, deactivate, see history. | done — `/admin/vouchers` GET/POST/PATCH, `(admin)/vouchers.tsx` screen |
| **Refund / chargeback management** | | `out of scope` — no real payments |
| **Audit log of admin actions** | | partial — admin status overrides are emitted to `order_events`, so they appear in the per-order timeline. Centralized admin audit view is `SKIP`. |

## 9 · Account

| Feature | What it does | Status |
|---|---|---|
| **Email / password sign-up** | | done (pre-existing) |
| **Sign-in / sign-out** | | done (pre-existing) |
| **Role-aware home routing** | | done (pre-existing) |
| **Edit profile** | Name, phone. | partial — captured at register; edit-in-place is `SKIP` (low ROI; admin can override role) |
| **Change password / reset password** | | missing — `SKIP` (no email infra; the password is already bcrypt-hashed) |
| **Saved addresses** | | done — see above |
| **Saved recipients** | | done — see above |
| **Favorites** | | done — see above |
| **Notification preferences** | "Email me on status change." | missing — `SKIP` (in-app inbox is the V1 notification surface; preferences make sense once channels exist) |

## 10 · Concept-invariant exclusions (cited)

These are NOT bugs. They're deliberate scope decisions, all traceable to a deck slide or `docs/GENESIS.md`.

- **Real payment gateway (Omise / Stripe)** — Slide 9: "real payment gateway excluded." Demo VISA placeholder used; Pass-3 tip flow records intent only.
- **Real delivery dispatch (Lalamove)** — Slide 9: "real delivery dispatch excluded." Status changes are manual via seller/admin; ~~courier is not wired~~ ✅ **Pass 3** assigns a *mock* courier (name + phone + lat/lng from a fixed list) when the seller flips to `out_for_delivery`. The map is a stylised SVG (no real GPS) — see `components/DeliveryMap.tsx`.
- **Push notifications** — Slide 9: "push notifications excluded." Replaced by in-app notifications inbox + ✅ **Pass 3** `NotifToast` (polled, not real push).
- **Camera / photo upload** — not on deck. ✅ **Pass 3** seller picks one of 4 preset Unsplash URLs on `delivered`; the URL is saved to `orders.delivery_photo_url`. No real upload.
- **Production deploy** — Slide 9: "production deploy excluded." Local Flask + Expo dev only.
- **Multi-merchant split fulfilment** — GENESIS §The product: "V1: single merchant — multi-merchant is V2 because split-fulfilment isn't solved."
- **Subscriptions** — GENESIS §What V1 is NOT.
- **B2B / event florals** — GENESIS §What V1 is NOT.
- **AR / 3D preview** — GENESIS §What V1 is NOT.
- **LLM-backed Intent Mode** — GENESIS §Features-in-scope §3: "For V1 the suggestion engine is rule-based on occasion (no LLM call)."
- **Seasonal price flex (Valentine's 2.7× problem)** — GENESIS §The product: "Flat consumer pricing across seasons; platform absorbs volatility on the merchant side (V2 — V1 is flat margin)."
- **Email confirmations / receipts** — out of natural scope (no email infrastructure pitched in the deck).
- **Refer-a-friend** — not on the deck.
- **Gift-wrap upsells** — every Florière order is already gift-wrapped per the deck.

---

## 11 · Implementation order (what got built in this pass)

Dep order — backend before frontend, schema before code:

1. **Schema (`backend/schema.sql`)** — added `order_events`, `order_messages`, `order_ratings`, `notifications`, `addresses`, `recipients`, `favorites`, `vouchers`; extended `orders` with `subtotal_thb`, `discount_thb`, `voucher_code`, `delivery_window`, `delivery_district`, `recipient_phone`, `cancel_request`, `cancel_reason`; extended `merchants` with `is_open`, `open_hour`, `close_hour`.
2. **Seed (`backend/seed.sql`)** — added 2 default addresses + 2 recipients for `pete@`, 3 sample vouchers (`WELCOME10`, `STUDIO200`, `GRADER25`), and 1 favorite bouquet so the heart shows pre-filled in the demo.
3. **Routes**
   - `routes/orders.py` — emit `order_events` on checkout + status change; add `/orders/<id>/events`, `/orders/<id>/messages`, `/orders/<id>/rating`, `/orders/<id>/cancel_request`, `/orders/<id>/cancel_response`, `/orders/<id>/reorder`. Notify counterparty on every transition.
   - `routes/account.py` (new) — `/account/{addresses,recipients,favorites,voucher/preview}` CRUD.
   - `routes/notifications.py` (new) — `/notifications`, `/notifications/unread_count`, `/notifications/read`.
   - `routes/catalog.py` — `?q=`, `?occasion=`, `?sort=` on `/catalog/curated`. Aggregate `avg_stars` + `review_count` per bouquet. `/catalog/curated/<id>` now returns recent reviews.
   - `routes/seller.py` — `is_open` / `open_hour` / `close_hour` toggle; `/seller/low_stock`; `/seller/ratings`; `/seller/public` (read-only merchant card for purchasers).
   - `routes/admin.py` — `avg_rating` + `pending_cancel_requests` in `/admin/metrics`; full `/admin/vouchers` CRUD.
4. **Types (`lib/types.ts`)** — `OrderEvent`, `OrderMessage`, `Notification`, `Address`, `Recipient`, `Voucher`, `VoucherPreview`, `MerchantPublic`, `SellerRating`, `CuratedReview`; extended `Order` and `CuratedBouquet`.
5. **Components**
   - `Stars.tsx` (new) — tap-to-rate or display-only 5-star control.
   - `OrderTimeline.tsx` (new) — append-only event timeline with role pills + relative timestamps.
   - `MessageThread.tsx` (new) — chat bubbles, read-receipts, draft + send.
   - `NotifBell.tsx` (new) — header inbox indicator with unread count poll every 8s.
   - `AppHeader.tsx` — slot in `NotifBell` by default for any authenticated user.
   - `format.ts` — added `prettyDateTime`, `relativeTime`, `etaSummary`, `stars`.
6. **Screens**
   - `app/notifications.tsx` (new) — full inbox.
   - `app/(purchaser)/home.tsx` — shop open/closed banner with rating, quick links to Orders / Account / Favorites.
   - `app/(purchaser)/account.tsx` (new) — address book + recipients CRUD.
   - `app/(purchaser)/favorites.tsx` (new) — saved bouquets grid.
   - `app/(purchaser)/curated/index.tsx` — search box, sort chips, rating chip on card.
   - `app/(purchaser)/curated/[id].tsx` — favorite pill in header, average rating, recent reviews list.
   - `app/(purchaser)/checkout.tsx` — saved-address picker, saved-recipient picker, delivery-window chips, recipient phone, voucher block.
   - `app/(purchaser)/orders/index.tsx` — rating stars when delivered, cancel-request pill.
   - `app/(purchaser)/orders/[id].tsx` — timeline card, message thread, ETA line when out-for-delivery, cancel-request flow (form + status banner), 5-star rating card when delivered, reorder button.
   - `app/(seller)/home.tsx` — open/close toggle button, merchant rating, low-stock card, cancel-request banner, recent ratings.
   - `app/(seller)/orders/[id].tsx` — cancel-request approve/deny card, timeline, message thread.
   - `app/(admin)/home.tsx` — avg rating KPI, pending-cancel-request alert, link to vouchers.
   - `app/(admin)/orders.tsx` — filter chips including a `CANCEL REQ` filter.
   - `app/(admin)/vouchers.tsx` (new) — voucher CRUD.
7. **Navigation gate** — whitelisted `/notifications` as a shared route across roles.

---

## 12 · Things deliberately skipped (so the audit is honest)

| Idea | Why skipped |
|---|---|
| Voucher usage tracking (one-shot codes) | Single demo merchant, single demo purchaser — `WELCOME10` works for everyone in V1 because uniqueness enforcement isn't visible in the rubric. Trivial follow-up: a `voucher_uses` join table. |
| Per-merchant payout view | V1 is single merchant — admin's gross revenue tile says the same thing. |
| Daily order cap | The `is_open` toggle covers the same use case for the demo. |
| Recommendations / "you might also like" | Curated catalog is 4 items. Recommendations would feel manufactured. |
| Recently viewed | Favorites cover the "I want to come back to this" intent. |
| Notification preferences | No channels exist beyond in-app. Preferences belong with the channels. |
| Edit-profile, change-password, password-reset | No email infra. The bcrypt + sessions setup is already on-spec. |
| ~~Click-to-call recipient~~ ✅ Pass 3 | Pass 3 ships `components/CallModal.tsx` as a stylised mock — we still don't launch the OS dialer, but the affordance is there. |
| Gift-wrap selection | Every Florière order is wrapped per the deck — making this a choice would dilute the brand. |
| AR / 3D bouquet preview | Out of scope per GENESIS. |
| Refund flow | No payment gateway means no refunds. |
| ~~Real GPS ETA~~ ✅ Pass 3 (mocked) | Pass 3 ships a stylised SVG `DeliveryMap` + seeded mock courier with `eta_minutes` countdown via `/orders/<id>/courier`. The lat/lngs are deterministic but not georeferenced — the map is editorial, not cartographic. |
| Order-level address change after placement | Needs careful re-validation against merchant; low ROI for a 5-minute demo. |

---

## 13 · How to demo the new surface (for the 5-7 min video)

Suggested addition to the existing flow in `README.md`:

1. **(Existing) Landing → register → curated → compose → intent → cart → checkout.**
   - On checkout, point out: saved-address chips, saved-recipient chips, delivery-window chips, voucher input (apply `GRADER25` for a visible 25% discount).
2. **Order detail (purchaser)** — show the live tracker, the **timeline card** (with event timestamps), the **message thread** (send "Please leave at reception"), and the **cancel-request form** (after switching the order through the seller flow).
3. **Switch to seller** — show shop OPEN / CLOSED toggle, recent ratings card, **cancel-request approve/deny banner**, and the same per-order **timeline + message thread**.
4. **Switch to admin** — show the avg rating KPI, the **pending cancel-request alert**, then visit **`/admin/vouchers`** to create a new code on the fly, and the new **status filter** on the all-orders page.
5. **Back to purchaser** — open notifications inbox to show the bell badge, tap a notification to deep-link to the order, then on a delivered order **leave a rating** and **reorder**.

The "depth" beats are: timeline, messaging, cancel-request, rating, voucher, notifications, reorder, shop-hours. Every one is a "real app would have this" beat the grader will recognise instantly.

---

## 14 · Pass 3 — mocked-but-visible features (added 2026-05-11)

Pete reversed the Slide-9 stance on "those features are out of scope" — for
the demo we DO show them, but as **honest mocks**. The deck still locks the
*stack* (no real Maps SDK, no real payment, no real push). Each Pass-3 item
is wired through the same backend so the persistence is real even though
the external service isn't.

| Feature | UI surface | Backend | Mocking detail |
|---|---|---|---|
| **Live SVG delivery map** | `app/(purchaser)/orders/[id].tsx` ("Courier en route" card) | `GET /orders/<id>/courier` returns `progress` (0..1), `remaining_minutes` | `components/DeliveryMap.tsx` — react-native-svg, **no `react-native-maps`** (would break web). Two pins, dashed champagne route, moving charcoal dot. Editorial, not georeferenced. |
| **Courier auto-assign on dispatch** | Status badge + courier card | `PATCH /orders/<id>/status` (target=`out_for_delivery`) writes `courier_name`, `courier_phone`, `dispatched_at`, `eta_minutes`, lat/lngs | `routes/orders.py::_pick_courier` rotates 5 fixed names. Lat/lngs are deterministic per-order via MD5 seed. |
| **Mock phone call** | `components/CallModal.tsx` | n/a (UI only) | "Ringing…" modal with elapsed-time counter. No `tel:` URL — we don't open the OS dialer. Surfaced on courier (purchaser side), recipient (seller side), studio (purchaser side, against `merchants.phone`). |
| **Courier chat (mini-thread)** | `components/CourierContactCard.tsx` | `GET/POST /orders/<id>/messages?channel=courier` | `order_messages.channel` enum + `order_messages.sender_role` extended with `courier`. Every purchaser message triggers an automatic scripted courier reply via `COURIER_SCRIPT` (4 lines). |
| **Delivery photo** | `components/DeliveryPhotoCard.tsx` (Picker + Display) | `POST /orders/<id>/delivery_photo` saves URL; `GET /orders/photo_presets` returns 4 Unsplash URLs | Seller picks from a grid; URL persists to `orders.delivery_photo_url`. Purchaser sees a centered photo card with cream/champagne frame. |
| **Tip the courier** | `components/TipCard.tsx` on the purchaser order detail | `POST /orders/<id>/tip` | Chip presets `฿20 / ฿50 / ฿100 / Custom`, optional thank-you note. Stored in `orders.tip_thb / tip_note / tip_at`. **No real payment.** |
| **Tips KPIs** | seller home (week + all-time) · admin home (platform total) | `GET /seller/tips`, `GET /admin/metrics` (`tips_total_thb`, `tips_count`) | SUM/COUNT over `orders.tip_thb`. |
| **Mock push toast** | `components/NotifToast.tsx` mounted in `app/_layout.tsx` | Reuses `GET /notifications` (polled every 8s) | When the most-recent notification id flips, the toast slides in for 4.5s and is tap-to-deep-link. Still poll, not real APNs/FCM. |

**Demo seed primer:** order **#1001** is seeded as `out_for_delivery` with
courier already assigned (`dispatched_at = now - 4 min`, `eta_minutes = 18`,
courier = `Khun Nat`). The video can open it immediately without waiting
through real time.
