# Know Your Partner — Progress Report

_Scope: everything completed from the start of the project up to and including the Supabase integration._

---

## 1. Origin

The project began as a **front-end-only visual prototype**: a single `index.html` (~520 lines) containing HTML, CSS, and JavaScript. It simulated the entire two-person experience locally — the partner's answers were canned ("Preview the reveal" stand-in) and saved discoveries persisted in `localStorage`. There was no backend, no real rooms, no real-time.

The identified gap (per the roadmap's "Phase 2 — Make it actually work") was building a real multiplayer system:
real rooms, real participant sessions, real-time answers, a simultaneous reveal, and proper onboarding.

---

## 2. Work completed

### 2.1 Codebase split — single file → real project structure

The monolith `index.html` was broken into a maintainable, static-file-friendly structure (no build step required):

```
index.html           markup + screens (home · create · join · invite · lobby · play · wait · reveal · discoveries)
css/styles.css       full design system moved out of the inline <style> block
js/config.js         Supabase URL/anon key + room-code settings + mode detection
js/questions.js      question bank with metadata (depth, intimacy) + demo answers
js/store.js          state machine + two interchangeable backends (Supabase Realtime / local demo)
js/app.js            renders whatever Store.state says; wires all buttons
supabase/schema.sql  tables + RLS + realtime publication
supabase/seed.sql    32-question bank seed
```

Scripts attach their globals to `window` so classic `<script>` loading and inline `onclick` handlers work consistently.

### 2.2 Real-time backend (Supabase) — Phase 2 core

- **Schema** (`supabase/schema.sql`): six tables matching the product spec —
  `rooms`, `participants`, `sessions`, `questions` (with `depth`/`relationship_stage`/`intimacy_level` for the future question engine), `answers`, `discoveries`.
  - Row-level security policies enabled (permissive-anon for now; room code is the trust boundary).
  - **Realtime publication**: all tables added to `supabase_realtime` so Postgres broadcasts change events to subscribers.
- **Seed data** (`supabase/seed.sql`): all 8 categories / 32 prototype questions inserted with metadata.
- **State machine** (`js/store.js`):
  ```
  WAITING_FOR_PARTNER → BOTH_CONNECTED → ANSWERING → ONE_READY → BOTH_READY → REVEAL
  ```
  The store owns the machine; the UI just renders `Store.state.screen`.
- **Two interchangeable backends**:
  - `supabase` — real two-person rooms via Postgres Realtime:
    - create room (with unique-code retry on collisions), join by 4-char code
    - per-room Realtime channel with **presence** (partner genuinely "connected")
    - sessions sync both devices to the same category/question index
    - answers upserted per participant; when the 2nd answer for a question lands, **both screens unlock to reveal approximately simultaneously**
    - session auto-resume after page refresh (participant id kept in localStorage)
    - discoveries mirrored to the server table
  - `demo` — local simulation of the partner, keeping the prototype walkable alone with no credentials.
- **Mode detection** (`js/config.js`): app boots in `supabase` mode once real credentials are present, otherwise `demo`.

### 2.3 Onboarding flow

Added the proper invite stage the product brief called for:

```
Start together → your name / partner's name → Create room
→ "Send this to Sarah" (room code + Copy) → waiting for partner →
  auto-advance to the lobby the moment the partner joins (presence).
```

Partner side follows a join-by-code path with their own name.

### 2.4 Emotionally safe answer mechanics

The two "I'd rather not" options are now first-class (_not_ failures):
- **"I'd rather not answer"** → stored as `declined`
- **"I don't know yet"** → stored as `skipped`

Both unlock the reveal in sync, so neither person is blocked, and the reveal renders gentle placeholders instead of a confession-like blank.

### 2.5 Verified end-to-end on a live Supabase project

- Credentials configured in `js/config.js` for the user's project.
- `schema.sql` + `seed.sql` run by the user; verified tables + question rows exist via REST.
- **Found and fixed a real deployment issue**: Realtime was silent until all six tables were added to the `supabase_realtime` publication.
- **Two-browser simulation test passed** (Node, using supabase-js directly, same client the app wraps):
  ```
  room created → guest joined → host answered → SUBSCRIBED
  guest answered → realtime delivered the partner's answer event
  both answers in DB: 2 → discovery saved → test rows cleaned up
  ```
- The user independently confirmed the flow in real 2-tab browser testing: **"it run perfectly."**

---

## 3. Limitations / not done

Intentionally out of scope so far (per the product roadmap):

- **Shared discovery archive** — "Keep this" saves to `localStorage` per device/origin; the `discoveries` table is wired up but the UI reads the local mirror, so a saved discovery isn't yet visible on the partner's device.
- **Accounts & relationship history** — deferred by design (no forced signup).
- **Smarter question engine** — metadata is seeded (`depth`, `intimality`, etc.), but question selection isn't AI/persona-driven yet.
- **Conversation mode** ("Want to talk about this?") and memory timeline — Phase 3 items.
- **Security hardening** — RLS is permissive-anon; production needs rate-limiting, room expiry, signed participant claims, longer codes.
- **Static-host deployment** — not configured (works locally; needs Netlify/Vercel/etc. for two real devices).

---

## 4. Verification record

| Check | Result |
|---|---|
| `node --check` on all 4 JS files | pass |
| Demo-mode UI smoke test (create → join → answer → decline/skip → save → finish) | pass |
| Mode detection with real credentials | `supabase` |
| `rooms` + `questions` REST read | pass |
| Two-client CRUD (create/join/session/answers/discovery) | pass |
| Realtime event delivery after publication fix | pass |
| User's 2-tab browser test | pass |

---

_Report date: 2026-08-09_