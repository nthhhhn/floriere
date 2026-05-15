# Florière — pre-demo checklist (Pass 4)

**Generated:** 2026-05-11 · **submission due:** 2026-05-18 23:59
**Reference deck:** Slide 9 (scope) · Slide 10 (six features) · Slide 11 (tech stack) · Slide 12 (limitations)

This file is the operator's go-bag for the grading video. Use it as a pre-flight on demo day.

---

## 1 · Slide-10 features — verified working

| # | Feature | Surface | Verified |
|---|---|---|---|
| 01 | Concierge quiz (Pass 6 — replaces deck's DIY canvas; see `docs/GENESIS.md` §Phase 2 scope expansion) | `/(purchaser)/compose` | ✅ 7-step guided quiz · 18 palettes · 20 moods · AI preview (gemini → pollinations → stub) · "Add to cart" |
| 02 | Curated Collections (12 bouquets / 11 occasions, search + sort + ratings) | `/(purchaser)/curated` | ✅ list · `?q=` · `?occasion=` · `?sort=` · ratings + reviews |
| 03 | Intent Mode (occasion → suggestion + card) | `/(purchaser)/intent` | ✅ 11 occasions wired in `INTENT_SUGGESTIONS` · rule-based suggestion · suggested message |
| 04 | Dual-mode Delivery — **Scheduled** (1-hour slots `09:00–10:00 … 20:00–21:00`) or **Urgent** (today ASAP, +฿150) + address · phone · message · voucher | `/(purchaser)/checkout` | ✅ mode toggle · 12 slot chips · urgent surcharge row · `GRADER25` discount · demo VISA card |
| 05 | Account & Orders (auth · tracker · timeline · chat · ratings · reorder) | `/(auth)/*` · `/(purchaser)/orders/*` | ✅ register/login/logout · stage tracker · event timeline · message thread · 5-star rating · reorder |
| 06 | Brand Presentation (single accent · serif heads · cream surfaces) | every screen | ✅ champagne single-accent · Georgia headlines · cream bg · no emoji bullets · `BrandMark` on landing/login |

## 2 · Pass-3 mocks — verified working

| Feature | Surface | Verified |
|---|---|---|
| Live SVG delivery map | order #1001 (out_for_delivery) | ✅ dashed champagne route · moving charcoal dot · plum dest pin · 10s server-poll + 400ms local drift |
| Auto-assigned mock courier (name + phone + lat/lng) | seller flips status to `out_for_delivery` | ✅ deterministic via MD5 seed · 5 names rotated |
| Mock Call modal (purchaser/seller/studio) | `CallModal` on every call button | ✅ no `tel:` URL · ringing dots animate · "Demo — not a real call" |
| Courier chat (separate channel, scripted replies) | purchaser order detail · "Message" toggle | ✅ 4-line scripted COURIER_SCRIPT rotates · purchaser→courier message fires auto-reply |
| Delivery photo (preset Unsplash picker) | seller-side picker on delivered · purchaser-side display | ✅ 4 preset URLs · saved to `orders.delivery_photo_url` |
| Tip the courier (chips + custom + note) | purchaser order detail after `delivered` | ✅ `฿20 / ฿50 / ฿100 / Custom` · honest "demo — no real payment" copy |
| Push-toast (`NotifToast`) on new unread | mounted in `app/_layout.tsx` | ✅ polls `/notifications` every 8s · slides from top · tap deep-links |
| Tips KPIs (seller + admin) | seller home · admin home | ✅ this-week + all-time · platform total |

## 3 · Pass-4 bugs found AND fixed in this pass

| # | Bug | Severity | Fix |
|---|---|---|---|
| 1 | **Unsplash `source.unsplash.com/featured/…` deprecated Oct 2024** — every curated card and delivery photo would 503 during the demo (the single biggest demo risk) | **CRITICAL** | Swapped to direct `images.unsplash.com/photo-<id>` CDN URLs in `seed.sql`, `routes/orders.py::DELIVERY_PHOTO_PRESETS`, and `app/index.tsx` hero. These are stable, no-key, free. |
| 2 | **Curated detail used fragile `flower.name → kind` string-mangling** (`f.name.toLowerCase().replace("'s",'').replace(' ','_')`) for FlowerArt selection — would silently fall back to "generic" if name format ever changed | medium | Backend `/catalog/curated` + `/catalog/curated/<id>` + `/catalog/intent` now return `f.illustration` directly; frontend uses it. `CuratedBouquet.flowers[].illustration` added to types. |
| 3 | **OrderTimeline cluttered with every chat message** — every send wrote a `message` row to `order_events`, so the timeline became a duplicate of the chat thread | medium | `OrderTimeline` filters out `event_type === 'message'` before rendering. Status changes, cancellations, ratings, and notes still appear. |
| 4 | **Inline hex literals scattered** (`#FAF1E2`, `#FAF4EA`, `#EDE6DC`, `#F1E6D2`, `#E5DEEC`, `#D8E2D6`, `#E9D2CD`) — broke the "every color lives in `theme/`" rule | low | Added `colors.champagneTint`, `colors.champagneBg`, `colors.plumBg`, `colors.successBg`, `colors.dangerBg`. Updated `compose.tsx`, `account.tsx`, `register.tsx`, `(seller)/catalog.tsx`, `(auth)/login.tsx`, `Pill.tsx`, `StatusBadge.tsx`. |
| 5 | **Dead `index.ts` at frontend root** imported a non-existent `./App` module | low | Deleted. `package.json::main = expo-router/entry` is the real entry point. |
| 6 | **Unused imports** — `colors` in 3 admin screens, `g` in `auth.py`, `from datetime import date` in `admin.py` | trivial | All removed. |

## 4 · Simplifications applied (with why)

| Change | Why |
|---|---|
| OrderTimeline filters out chat-message events | The chat thread already shows those — duplication was noise. Removes one helper call site (`_emit_event(order_id, 'message', …)` rows are still written for audit but not rendered). |
| 5 shared tint tokens (`champagneTint`, `champagneBg`, `plumBg`, `successBg`, `dangerBg`) | Replaced 7 inline hex literals across 7 files with named tokens. Tone colors now have a single source of truth. |
| Backend returns `illustration` on curated flower lists | Removes 1 line of string-mangling on the frontend and makes future flower kinds robust to name changes (e.g., adding "King Protea" wouldn't need a frontend code change). |

## 5 · Open risks (things Pete should know before recording)

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Unsplash CDN slow on demo Wi-Fi** | low | The new URLs are CDN-served. If the conference Wi-Fi is bad, switch to localhost wired or your phone hotspot. The placeholder squares render gracefully if the image fails. |
| **Image cold-start delay on first load** | low | After the first card renders, `expo-image` caches. Open `/(purchaser)/curated` once before recording. |
| **`order #1001` ETA drifts past 0** | low | `eta_minutes = 18` minus elapsed-since-dispatch. The seed sets `dispatched_at = NOW() - 4 MINUTE`, so you have 14 min from re-seed before the courier "arrives." If you wait too long, re-run `python scripts/init_db.py --seed` to reset. |
| **`source.unsplash.com` references in the FEATURE_AUDIT.md / TASKS.md comments** | none | Those are docs, not runtime code. Safe to leave. The runtime images are all fixed. |
| **Seller logs in but order list shows everything** | impossible | Backend filters by `merchant_id` from `user_id`. Verified in `routes/orders.py::seller_incoming`. |
| **`/(seller)/orders/1001` deep-link from a purchaser-side notification** | none | Notification hrefs are always written for the recipient's role. Cross-role deep-links are not generated. |

## 6 · What Pete should do before recording the video

In order — do these on the demo machine, exactly once, in a clean terminal:

1. **Stop everything currently running.** (Flask on :5000, Expo on :8081.)
2. **Re-init the DB** to pick up the new seed URLs + schema reminders:
   ```
   cd backend
   source venv/bin/activate
   python scripts/init_db.py
   ```
   This drops + recreates all tables, re-seeds the demo data, and rehashes the 3 demo passwords.
3. **Start the backend:**
   ```
   python app.py
   ```
   Verify `http://127.0.0.1:5000/health` returns `{"status":"ok"}`.
4. **Start the frontend:**
   ```
   cd frontend/floriere-app
   npm run web
   ```
   Browser opens at `http://localhost:8081`.
5. **Pre-warm the image cache:**
   - Land on the homepage. Wait for the peony hero to load fully.
   - Click "Get started" → register a throwaway account OR sign in as `pete@floriere.test / purchaser123`.
   - Visit `/(purchaser)/curated`. Wait for the 12 curated cards to load fully.
   - Click into any one. Wait for the hero image to load. Hit back.
   - Visit `/(purchaser)/orders/1001` (the pre-seeded `out_for_delivery` order). Wait for the map to render. The courier dot animates.
6. **Sign out. Now you're at a known-good state.** Sign back in as `pete@floriere.test`.
7. **Record.** Follow the 14-step video flow in `README.md §"What to show in the 5-7 minute video"`. Suggested take order is already optimised for narrative.

### Mid-demo recovery

If anything looks weird mid-recording:
- **Curated card missing image:** the URL hasn't finished loading. Wait 1 sec — `expo-image` is async. The placeholder square is design-intentional, not a bug.
- **Map stuck:** force-refresh the order page. Backend re-computes progress on every GET.
- **NotifToast doesn't fire:** the toast needs a *new* notification id since the screen first loaded. Trigger one by flipping an order status in the seller view, then come back to the purchaser view. Wait ≤8s.
- **Order #1001 is "delivered":** you waited too long. Re-seed (`python scripts/init_db.py --seed`) and start the demo over.

## 7 · Submission deliverables (Monday 2026-05-18 23:59)

1. **Presentation PDF** — compare-to-proposal. Reuse Phase 1 deck; add a closing slide listing every Pass-2 + Pass-3 depth win.
2. **YouTube link (unlisted)** to the 5–7 minute video. Upload at least 24h ahead of the deadline.

Both are submitted via the Chula App Dev course portal.

---

*Generated by Pass 4 (final polish) — see `PLAN.md` for the full build trail.*
