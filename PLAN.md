# Florière Phase 2 build plan

**Deadline: Monday 2026-05-18 23:59.** Grading: Functionality 15% · Quality/Difficulty 5% · UX/UI 3% · Presentation 2% = 25%.

Anything not on the Phase 1 deck is out of scope. Anything on the deck that isn't built is a bug.

## Pass 1 — foundations (this session)

- [x] Clone friend's repo, assess, decide rewrite scope
- [ ] **Backend rewrite**
  - [ ] `schema.sql` — 3-role users, sessions, merchants, flowers, curated_bouquets, curated_bouquet_flowers, carts, cart_items, cart_item_flowers, orders, order_items, order_item_flowers
  - [ ] `db.py` — connection pool, env-var driven, sensible defaults
  - [ ] `app.py` — Flask factory, CORS for the Expo web origin
  - [ ] `routes/auth.py` — register, login (returns token), logout, `/me`
  - [ ] `routes/catalog.py` — public: list curated bouquets, list flowers (so purchasers can compose)
  - [ ] `routes/cart.py` — purchaser only: get cart, add curated/custom/intent item, remove item, clear
  - [ ] `routes/orders.py` — purchaser places from cart; purchaser lists own orders; seller lists merchant orders + updates status; admin lists all + overrides
  - [ ] `routes/seller.py` — seller manages own flowers (CRUD)
  - [ ] `routes/admin.py` — admin lists users + flips/cancels orders
  - [ ] `seed.sql` — 1 merchant (with user row), 5–8 flower stems, 4 curated bouquets, 1 purchaser, 1 admin
- [ ] **Frontend rewrite**
  - [ ] `theme/` — `colors.ts`, `fonts.ts`, `spacing.ts` (brand tokens from GENESIS)
  - [ ] `components/` — Button, Card, Field, Pill, Section, Header, BrandLogo
  - [ ] `lib/api.ts` — token-aware fetch client, role helpers
  - [ ] `lib/session.ts` — AsyncStorage on native, localStorage fallback on web
  - [ ] `app/_layout.tsx` — root provider, session bootstrap, role-aware initial route
  - [ ] `app/index.tsx` — **landing experience** (brand statement, two CTAs: Sign in / Get started)
  - [ ] `app/(auth)/login.tsx`, `app/(auth)/register.tsx` — register includes "I want to sell flowers" toggle for merchant signup (admin is seed-only)
  - [ ] **Purchaser** (`app/(purchaser)/`)
    - [ ] `home.tsx` — three-mode chooser (Compose / Curated / Intent)
    - [ ] `curated/index.tsx` — list, occasion filter
    - [ ] `curated/[id].tsx` — detail, add to cart
    - [ ] `compose.tsx` — DIY Studio: flower stem picker, quantity, name your bouquet, add to cart
    - [ ] `intent.tsx` — form (occasion, recipient, tone) → suggested bouquet + suggested message → add to cart
    - [ ] `cart.tsx` — list cart items, remove, proceed
    - [ ] `checkout.tsx` — delivery date/time/address/recipient + message; placeholder payment block; place order
    - [ ] `orders/index.tsx` — list
    - [ ] `orders/[id].tsx` — detail + status track
  - [ ] **Seller** (`app/(seller)/`)
    - [ ] `home.tsx` — incoming orders queue
    - [ ] `orders/[id].tsx` — detail, status updater
    - [ ] `catalog.tsx` — flower stem CRUD
  - [ ] **Admin** (`app/(admin)/`)
    - [ ] `home.tsx` — KPI tiles + recent orders
    - [ ] `users.tsx` — user list, role view
    - [ ] `orders.tsx` — all orders, force status / cancel
- [ ] **Adaptive pass** — `useWindowDimensions` based responsive container (phone < 600, tablet 600–960, desktop > 960). Same components, wider content frame on desktop. Center the phone-frame on web for screens that should feel native.
- [ ] **Top-level `README.md`** — run instructions, demo creds, what to show in the video
- [ ] **First commit** to local repo (no push yet — confirm with Pete before pushing back to friend's remote)

## Pass 2 — depth & competitive parity (shipped 2026-05-11)

The full audit and ROI rationale live in [`docs/FEATURE_AUDIT.md`](docs/FEATURE_AUDIT.md). Highlights:

- [x] **Order event timeline** — append-only `order_events` table; every status change writes a row; rendered as a magazine-style timeline on both purchaser + seller order detail
- [x] **Cancellation request flow** — purchaser can request cancel after seller accepts; seller approves/denies; admin can still force-cancel. Banner UI on every side.
- [x] **Per-order chat** — `order_messages` table, three-way (purchaser ⇄ seller ⇄ admin), bubble UI with read-receipts
- [x] **In-app notifications inbox** — `notifications` table, `NotifBell` in header (polls every 8s), full inbox screen at `/notifications`, deep-link on tap
- [x] **5-star ratings** — `order_ratings` table, purchaser rates delivered orders, aggregates surface on curated cards + detail + merchant card + admin avg KPI
- [x] **Reorder** — clones an order's items into the cart in one tap (`POST /orders/<id>/reorder`)
- [x] **ETA window** (UI-only) — `delivery_window` enum on orders + checkout chip; rendered as "Arriving today · Afternoon" on `out_for_delivery` orders
- [x] **Address book + saved recipients** — purchaser CRUD under `/account`, checkout shows chips
- [x] **Favorites / wishlist** — heart toggle on curated detail + `(purchaser)/favorites` screen
- [x] **Voucher codes** — `vouchers` table + admin CRUD; checkout has apply/remove flow with live preview. Seed includes `WELCOME10`, `STUDIO200`, `GRADER25`.
- [x] **Search + sort + filter** on curated index (`?q=`, `?sort=`, `?occasion=`)
- [x] **Shop open/close + hours** — merchant toggle on seller home, badge on purchaser home
- [x] **Low-stock alerts** for sellers — `/seller/low_stock`, banner on seller home
- [x] **Recent ratings dashboard** — seller home + curated detail review list

## Pass 3 — reversal: mock the "out of scope" UI (shipped 2026-05-11)

Pete reversed the Slide-9 exclusions for the demo: keep the stack invariants
(no real Maps SDK, no real payment, no real push), but DO build the UI for
each excluded feature so the video reads as complete. Each item is a believable
mock — the demo flow looks like a real delivery app at a glance, but no real
external service is wired in.

- [x] **Live delivery map** — stylised SVG canvas (no `react-native-maps`).
  Cream/champagne grid, dashed champagne route line, plum destination pin,
  charcoal courier dot that animates along the route. ETA counts down as
  the dot progresses. Backend assigns a mock courier name + phone +
  origin/dest lat-lngs + `dispatched_at` + `eta_minutes` when the seller
  flips status to `out_for_delivery`. New `/orders/<id>/courier` endpoint
  returns a freshly-computed progress ratio so reloads stay stable.
- [x] **Courier contact** — courier name + phone on purchaser order detail;
  **Call** opens a `CallModal` (mocked, no `tel:` URL); **Message** opens an
  inline courier chat (separate channel from the order-level thread). Scripted
  courier replies fire automatically so the demo can show a conversation.
  Seller order detail also gets a **Call recipient** button; purchaser gets a
  **Call the studio** button on the merchant card.
- [x] **Photo on delivery** — seller picks one of 4 preset Unsplash URLs when
  the order is delivered, saved to `orders.delivery_photo_url`. Purchaser
  sees it as a centered card on the order detail with "Left at reception"
  caption.
- [x] **Tip the courier** — chip choices `฿20 / ฿50 / ฿100 / Custom`,
  optional thank-you note. `POST /orders/<id>/tip` records the intent
  (no real payment). Seller home shows **Tips this week**; admin home shows
  total courier tips KPI.
- [x] **Mock push notifications** — `NotifToast` component slides in from the
  top when the unread count goes up. Tap to deep-link. Visually behaves like
  a real push without claiming to be one (still in-app polling, same 8s
  cadence as the existing `NotifBell`).

Schema additions (idempotent — `python scripts/init_db.py` drops + recreates):
- `orders.courier_name / courier_phone / courier_lat / courier_lng /
  dest_lat / dest_lng / dispatched_at / eta_minutes`
- `orders.delivery_photo_url / delivery_photo_at`
- `orders.tip_thb / tip_note / tip_at`
- `order_messages.sender_role` enum extended with `courier`
- `order_messages.channel` enum (`order`|`courier`) + `sender_name` (NULL-able sender_id)
- `merchants.phone`

Seed: order #1001 is pre-loaded as `out_for_delivery` with a courier already
assigned and `dispatched_at = now - 4 min`. The video can open it the moment
the app loads and demonstrate every Pass-3 feature without waiting through real time.

New components:
- `components/DeliveryMap.tsx`
- `components/CallModal.tsx`
- `components/CourierContactCard.tsx`
- `components/TipCard.tsx`
- `components/DeliveryPhotoCard.tsx` (`DeliveryPhotoDisplay` + `DeliveryPhotoPicker`)
- `components/NotifToast.tsx` (mounted in `app/_layout.tsx`)

No new top-level deps. Stack is unchanged: RN + TS + Expo + react-native-svg
+ expo-image (both already in `package.json`).

## Pass 4 — final polish (shipped 2026-05-11)

Pre-demo punch list lives in [`docs/PRE_DEMO_CHECKLIST.md`](docs/PRE_DEMO_CHECKLIST.md) —
read that before recording. Highlights:

- [x] **CRITICAL — fixed broken Unsplash URLs.** `source.unsplash.com/featured/?q=...`
  was deprecated Oct 2024 and now returns 503. Every curated card, the landing hero,
  and all 4 delivery photo presets would have failed on demo day. Swapped to direct
  `images.unsplash.com/photo-<id>` CDN URLs. See `seed.sql`, `routes/orders.py`,
  `app/index.tsx`.
- [x] **Fixed fragile flower-illustration matching.** Curated detail mangled
  `flower.name` to derive the FlowerArt kind ("Baby's Breath" → "babys_breath").
  Backend now returns `f.illustration` on every flower row — frontend uses it
  directly. `CuratedBouquet.flowers[].illustration` added to types.
- [x] **De-cluttered OrderTimeline.** Every chat send was writing a `message` event
  AND rendering as a duplicate row in the timeline. The timeline now filters
  `event_type === 'message'` — chat lives in the chat thread, timeline shows
  status changes / cancellations / ratings / notes.
- [x] **Consolidated inline hex literals.** Added 5 named tint tokens
  (`champagneTint`, `champagneBg`, `plumBg`, `successBg`, `dangerBg`). Removed
  7 inline hex codes from 7 files. `theme/colors.ts` is now the single source
  of truth.
- [x] **Removed dead code.** Deleted unused `frontend/floriere-app/index.ts`
  (imported a non-existent `./App`). Removed unused imports from `auth.py`,
  `admin.py`, and three admin screens.

## Pass 6 — marketplace UX pivot (in progress 2026-05-15)

Pete's call: editorial-only execution felt off. Pivot purchaser-side UX to a
Shopee / Grab / Uniqlo / Zara marketplace pattern. Brand palette stays
(cream / champagne / charcoal). Layout + IA + photography shift to commerce.

Shipped this pass:

- [x] **Bottom tab navigation** — `components/BottomTabBar.tsx` + new
  `app/(purchaser)/_layout.tsx` using `expo-router` `Tabs`. Five tabs:
  Home · Shop · DIY · Orders · Me. Cart, checkout, favorites, intent are
  hidden routes (`href: null`) still navigable from buttons.
- [x] **Real flower photos** — `lib/flowerImages.ts` maps every flower
  `illustration` + color to a stable `images.unsplash.com/photo-<id>` URL.
  SVG `FlowerArt` retired from product surfaces (still available as fallback).
- [x] **MarketHeader** — `components/MarketHeader.tsx`: brand label + cart
  badge + bell on top row, full-width pill search bar below. Reused on Home
  + Shop.
- [x] **ProductCard** — `components/ProductCard.tsx`: photo on top, occasion
  tag overlay, name + price + rating. Drop-in for grid layouts.
- [x] **Purchaser home rewrite** — `app/(purchaser)/home.tsx`. Promo banner,
  category chips strip, 3-up quick-actions, official-studio merchant card,
  Featured collections grid, Trending this week horizontal scroll.
- [x] **Shop tab (curated index)** — `app/(purchaser)/curated/index.tsx`.
  Marketplace listing with search + occasion chips + sort chips. Uses
  `ProductCard`.
- [x] **DIY Studio rework** — `app/(purchaser)/compose.tsx` +
  `components/BouquetCanvas.tsx`. Top half = live bouquet canvas (vase
  silhouette + blooms cluster in real time as user picks stems). Bottom
  half = stem picker grid with real flower photo + qty stepper. Inspired
  by the lotus-vibes reference Pete shared.
- [x] **Account ("Me") rewrite** — `app/(purchaser)/account.tsx`.
  Profile header (avatar + email + sign-out chip), order status grid
  (To pay / Preparing / On the way / To review), Shopee-style menu list.
  Addresses + recipients moved behind a "Manage" toggle.
- [x] **Favorites grid** — `app/(purchaser)/favorites.tsx`. ProductCard
  grid with heart-toggle accessory. Empty state with CTA.
- [x] **Orders index rewrite** — `app/(purchaser)/orders/index.tsx`. Status
  tab strip (All / To pay / Preparing / On the way / Delivered / Cancelled),
  rows with thumbnail + recipient + status pill + Reorder / Rate quick
  actions.
- [x] **Cart rewrite** — `app/(purchaser)/cart.tsx`. Marketplace row layout
  with thumbnail per item; subtotal card with single primary CTA.
- [x] **Curated detail composition list** — swapped SVG `FlowerArt` for the
  real-photo helper so the "06 The composition" list matches the product
  surfaces.

Shipped in second sweep:

- [x] **Intent Mode** screen — `app/(purchaser)/intent.tsx`. Occasion chip
  strip, suggested-bouquet hero card with photo + price + occasion tag,
  suggested-card-message panel, single CTA.
- [x] **Checkout** screen — `app/(purchaser)/checkout.tsx`. Cart-summary
  thumbnails row at top, sectioned form (Delivery / Recipient / Card /
  Voucher / Payment), saved-address + saved-recipient + time-window chip
  rows, grand-total card with the place-order CTA echoing the total.

Shipped in third sweep:

- [x] **Notifications inbox** — `app/notifications.tsx`. Marketplace list
  rows with kind-keyed icon (truck / chat / star / x / bell), title + body,
  relative time, unread accent border + dot. Empty state with art.
- [x] **Order detail hero** — `app/(purchaser)/orders/[id].tsx`. Added
  thumbnail hero card at the top (bouquet photo or delivery photo + status
  pill + recipient + date + price + ETA). Item flowers now render as
  photo chip rows instead of an inline string list.
- [x] **Seller catalog photo previews** — `app/(seller)/catalog.tsx`.
  Replaced SVG `FlowerArt` previews with real Unsplash photos in both the
  illustration-kind picker and the catalog list rows.
- [x] **Seller home order rows** — `app/(seller)/home.tsx`. Incoming-order
  cards swapped for marketplace rows with bouquet thumbnail + status pill
  + price; cancel-request pill stays.
- [x] **Admin orders list** — `app/(admin)/orders.tsx`. Marketplace row
  layout with thumbnail + actors + status; filter strip converted to
  chips; status-override picker as horizontal chip row per order.

Untouched on purpose (still fit the visual language):

- Auth screens (`app/(auth)/login.tsx`, `app/(auth)/register.tsx`) — split
  hero reads as a luxury intro to the marketplace.
- Landing `app/index.tsx` — brand moment; leads into marketplace home
  after sign-in.
- Seller order detail (`app/(seller)/orders/[id].tsx`) — operator
  workflow; current editorial cards work for the back office.
- Admin users + vouchers screens — operator workflow; same reasoning.
- Admin + seller home KPI grids — back-office surfaces; legible as-is.

Cleanup / known issues:

- `components/flowers/FlowerArt.tsx` is now only referenced from a few seller
  / admin / detail surfaces. Safe to keep as a fallback; no removal needed.
- No DB or backend changes in this pass — `flowers.illustration` still drives
  the photo lookup via the new helper. Demo DB does NOT need to be re-init.
- `package.json` unchanged — no new dependencies (all SVG via existing
  `react-native-svg`; tab bar via `@react-navigation/bottom-tabs` already
  transitively installed by `expo-router`).

## Pass 5 — submission (do on Sat/Sun 2026-05-17/18)

- [ ] Walk every screen on phone (Expo Go) + desktop browser. Note any layout breaks.
- [ ] Re-init DB on demo laptop (`python scripts/init_db.py`) — schema has new columns.
- [ ] Pre-warm image cache (see `docs/PRE_DEMO_CHECKLIST.md` §6).
- [ ] Record VDO (5–7 min) following the suggested flow in `README.md` §"What to show".
- [ ] Build presentation PDF — reuse Phase 1 deck + add a "depth shipped in Phase 2" closing slide listing every audit win.
- [ ] Upload VDO to YouTube (unlisted), get link.
- [ ] Submit (1) PDF + (2) YouTube link.

## Open questions (do not block on these — pick a default and move)

- Currency display: deck uses ฿ — keep `฿` symbol everywhere, integer baht (no decimals) for V1.
- Intent Mode suggestion engine: rule-based on occasion enum. Anniversary → Garden Romance + "For another year of you." Apology → Apology in Bloom + "I'm sorry — I meant to do better." Celebration → Celebration + "Cheers — to this moment." Sympathy → Lily-led arrangement + "Holding you in mind." Pick whatever feels brand-true; don't sweat it.
- Demo merchant name: pick something on-brand — "Floriste de Sukhumvit" or similar. Single merchant in V1.

## Out of scope (will not build, even if grading-tempting)

- Real payment integration (Omise/Stripe). UI mock only — "Pay with card (demo)" button.
- Real delivery API (Lalamove). UI shows scheduled date + status from seller updates.
- Push notifications.
- Production deploy.
- Multi-merchant split fulfillment.
- LLM-backed Intent Mode.
- AR / 3D bouquet preview.
- Subscriptions / B2B.
