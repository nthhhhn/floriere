# Tasks (in-session scratchpad)

For session-spanning plan see `PLAN.md`. This file is the active-session todo.

## Pass 1 (done — code shipped to this repo)

- [x] Clone friend's repo + assess
- [x] Pete-standard scaffold (CLAUDE.md, GENESIS, PLAN, TASKS, .claude/, .gitignore, vault pointer, _entities)
- [x] Backend rewrite — schema, db.py, app.py, auth.py, routes/{auth,catalog,cart,orders,seller,admin}.py, init_db.py
- [x] Frontend rewrite — theme + lib + components + flower SVGs + landing + (auth) + (purchaser) + (seller) + (admin)
- [x] Adaptive layout — Screen + breakpoint hook + per-screen widening
- [x] Top-level README — run commands, demo creds, video script

## Pass 2 (DONE — shipped 2026-05-11)

Full audit + ROI rationale in [`docs/FEATURE_AUDIT.md`](docs/FEATURE_AUDIT.md). Schema, routes, types, and UI extended in lockstep. NO new top-level dependencies.

After pulling these changes, Pete needs to:

- [ ] Re-init the DB to get the new tables — from `backend/`, `python scripts/init_db.py`
- [ ] Restart Flask (no `pip install` needed — no new Python deps)
- [ ] No `npm install` needed (no new frontend deps)
- [ ] Walk the updated 5-min video flow from `README.md` (now end-to-end through cancel-request + chat + ratings + reorder + vouchers)

## Pass 4 (DONE — shipped 2026-05-11)

Final polish before submission. Full punch list + pre-demo checklist in
[`docs/PRE_DEMO_CHECKLIST.md`](docs/PRE_DEMO_CHECKLIST.md).

- [x] Fixed deprecated `source.unsplash.com` URLs (would have 503'd on demo day)
- [x] Backend returns `illustration` on curated flower lists (no more name-mangling)
- [x] OrderTimeline filters out chat-message events (no more duplication)
- [x] Consolidated 7 inline hex literals → 5 new theme tokens
- [x] Removed dead `index.ts`, unused imports across 4 files

After pulling these changes, Pete needs to:

- [ ] Re-init the DB to refresh seed URLs (`python scripts/init_db.py`)
- [ ] Restart Flask + Expo
- [ ] Pre-warm image cache before recording (open homepage + curated index + order #1001 once)

## Pass 5 (the weekend before 2026-05-18)

- [ ] Record VDO walkthrough (5–7 min) following `README.md` §"What to show in the 5-7 minute video"
- [ ] Upload to YouTube (unlisted)
- [ ] Build presentation PDF (compare-to-proposal slide; reuse Phase 1 deck + closing depth-shipped slide)
- [ ] Submit PDF + YouTube link via Chula course portal

## Pass 7 — Concierge + dual delivery + placeholder imagery (2026-05-15/16)

State at compaction (Phase 2 deadline 2026-05-18 23:59):

- Tab `DIY` → `Concierge`. 7-step quiz (occasion → mood pick-3 → palette → flowers → message/format → anything-else → preview).
- Free-text "Other" occasion + 12 preset occasions. 18 palettes. 20 mood refs. 21 unique flower kinds / 43 DB rows.
- Concierge brief persists on `cart_items.concierge_brief` (JSON) + copies to `orders.concierge_brief` + `orders.preview_url` at checkout.
- Order statuses extended: `pending_review`, `awaiting_customer`. Concierge orders enter `pending_review`.
- 4 new endpoints: `concierge_accept` / `concierge_ask` / `concierge_decline` (seller) + `concierge_confirm` (purchaser). Brief panels + action bars wired on customer + seller order detail.
- Delivery modes: **scheduled** (1-hour slots `09:00–10:00 … 20:00–21:00`) vs **urgent** (today, ASAP 1–2h, +฿150 rush). `orders.delivery_mode` enum.
- AI image source order: Gemini 2.5 Flash Image → Pollinations.ai → tag-similarity stub. `GEMINI_API_KEY` in `backend/.env` (gitignored). Free tier 429 on every Gemini image model — Pollinations is the live live AI for now.
- **All `<Image>` swapped to `<PlaceholderImage>`** (tinted tile + serif label) — until Pete sources Pak Khlong Talat photos. `DeliveryPhotoCard` keeps real Image (user uploads).
- Demo concierge order **#1003** pre-seeded in `pending_review`. Log in as `merchant@floriere.test / merchant123` to see the brief panel + Accept/Ask/Decline.

Still open (ordered by ROI for grader):

- [x] **Curated bouquets — expand seed.** 4 → 12. Added: Birthday Wishes, With Gratitude, Get Well Soon, Graduation Day, Wedding White, New Arrival, Home Sweet Home, Bangkok Bloom. New occasions (birthday/thank_you/get_well/graduation/wedding/newborn/housewarming) wired into `INTENT_SUGGESTIONS`. Reseeded.
- [x] **Document scope expansion.** Added §"Phase 2 scope expansion" to `docs/GENESIS.md` covering Concierge quiz, brief-review loop, dual delivery, expanded catalog.
- [x] **README sanity check.** Role table, feature table, demo walkthrough, seed.sql line, lifecycle paragraph all updated. Added Pass 6 section. Old `Morning/Afternoon/Evening` window strings gone — no more matches in README.
- [x] **Reorder concierge brief.** Reorder now fetches `concierge_brief` from the orders row and copies it into `cart_items.concierge_brief` for any cloned line where `item_type='concierge'`. Other item types unchanged.
- [x] **OrderTimeline concierge icon.** `EVENT_LABEL.concierge = 'Concierge'`, bullet tone via `BULLET_TONE` map (plum for concierge, danger for cancel events).
- [x] **`ConciergeBrief` TS type.** Added `occasion_text?` and `preview_source?` to match what the backend actually returns.
- [ ] **Image sourcing (Pete's job).** When real Pak Khlong Talat photos exist, either swap PlaceholderImage back to `<Image>` per file, or extend PlaceholderImage to fall through to a URL when present.
- [ ] **Dead code.** `components/BouquetCanvas.tsx`, `lib/flowerImages.ts`, `lib/curatedImage.ts` are no longer imported. Safe to delete or keep for image-restoration later.
- [ ] **Gemini billing.** External — enable billing on the Google Cloud project keyed to `GEMINI_API_KEY`. Nothing else changes; source badge flips from "Pollinations" to "Nano Banana".
- [ ] **Browser click-through.** Concierge quiz → cart → checkout (test both Scheduled + Urgent) → order detail → log in as merchant → Accept/Ask/Decline → log back as Pete → Confirm.

## Notes

- Friend's commit `body.json` / `cookies.txt` / `order.json` / `status.json` were dev artifacts — removed.
- Friend's `(tabs)` route group was scrapped — replaced by `(purchaser)` / `(seller)` / `(admin)`.
- Friend's auth used a spoofable `X-User-ID` header → replaced with bcrypt + `sessions` table + Bearer tokens.
- Friend's `session.ts` used `localStorage` → replaced with SecureStore on native + AsyncStorage fallback on web.
- ~~Image-heavy curated cards hot-link `source.unsplash.com/featured/...`. If Unsplash rate-limits during the demo, swap to bundled JPGs in `assets/`.~~ **Pass 4: this URL pattern is deprecated.** Swapped to stable `images.unsplash.com/photo-<id>` CDN URLs in seed + photo presets + landing hero. If the demo Wi-Fi is bad, the empty-square fallback renders gracefully.
