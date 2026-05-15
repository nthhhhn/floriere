# Florière

Flower-gifting mobile app for Bangkok. Course project: **App Development, Year 2 Semester 2, Chula**.

Ideation, captures, and pitch-deck artifacts live in `C:\Users\petek\Workspace\50-Outside\uni-chula\year2\semester2\appdev\project\`. Genesis context — including the locked product concept, brand identity, and the Phase 1 deck structure — is captured in [`docs/GENESIS.md`](docs/GENESIS.md). **Read GENESIS before changing anything user-facing.**

## Phase

**Phase 2 = build the MVP.** Phase 1 (proposal/pitch deck + video) shipped 2026-04-26. Phase 2 deadline: **2026-05-18 23:59**.

## Stack (LOCKED — do not change)

The Phase 1 deck pitched this stack and the prof has it on record. Do not swap.

- **Mobile + Web:** React Native + TypeScript + Expo (Expo Router + react-native-web for browser parity)
- **Backend:** Python + Flask (REST API)
- **Database & auth:** MySQL with `users` + `sessions` tables. **No Firebase. No Supabase.** Auth is bcrypt + server-side session tokens, handled in Flask natively.

## Non-negotiables

1. **Three roles**: `purchaser` · `seller` · `admin`. Every endpoint enforces role at the server. The frontend renders a role-aware home after login.
2. **Adaptive UI**: every screen works on iPhone (primary), Android, and desktop browser from the same component tree. Mobile-native layout first; widen the content frame for tablet/desktop — don't reflow into a different design.
3. **Brand fidelity to Phase 1 deck**: palette + typography from [`docs/GENESIS.md` §Brand](docs/GENESIS.md#brand). No emoji bullets, no gradient explosions, no AI-deck tells.
4. **Features must trace to the deck**: see [`docs/GENESIS.md` §Features-in-scope](docs/GENESIS.md#features-in-scope). If a feature isn't on the deck, it's out of scope. If a deck feature is missing, it's a bug.
5. **Excluded by deck (UI-only or omitted)**: real payment gateway, real delivery dispatch, push notifications, production deploy. UI placeholders for payment + dispatch are fine.

## Repo layout

```text
backend/                Flask + MySQL API
  app.py                application factory + route imports
  routes/               auth, purchaser, seller, admin route blueprints
  db.py                 MySQL connection pool
  schema.sql            authoritative DDL — never edit DB by hand
  seed.sql              demo data (1 merchant, sample purchaser + admin, flowers, curated bouquets)
  requirements.txt
frontend/floriere-app/  Expo Router app (RN + TS + web)
  app/                  routes (file-based)
  components/           shared UI primitives (Button, Card, Field, etc.)
  theme/                colors, fonts, spacing — single source of truth
  lib/                  api client, session storage, role helpers
docs/
  GENESIS.md            the why + brand + deck — context source of truth
PLAN.md                 the active build plan (read this when picking up work)
TASKS.md                in-session scratchpad
README.md               run instructions (top-level)
```

## Workflow

1. **Pick up work**: read [`PLAN.md`](PLAN.md) → next unchecked task.
2. **Before any UI change**: cross-check [`docs/GENESIS.md` §Brand](docs/GENESIS.md#brand) — palette/type tokens live in `frontend/floriere-app/theme/`.
3. **Before any API change**: update `backend/schema.sql` if the data model moves; reseed.
4. **Demo creds + run commands**: top-level `README.md`. Keep it accurate — the grader will run it.
5. **Project artifacts (presentation PDF + VDO)**: produced from the project folder in the vault, not from this repo.

## Vault / repo split

- Code, schema, routes, components, theme, README, plan, tasks → **this repo**.
- Ideation, capture, daily-note entries, deck source (`build.js`), VDO script, Phase 2 pitch script for the grading video → **vault** at `Workspace/50-Outside/uni-chula/year2/semester2/appdev/project/`.
- The presentation PDF for grading submission is generated from the vault deck (rebuilt from `build.js` if the demo reveals features not on the original deck). It is NOT generated from this repo.
