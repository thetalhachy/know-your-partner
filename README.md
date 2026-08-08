# Know Your Partner

A two-person relationship discovery game. Ask better questions, answer together, reveal simultaneously, and keep the discoveries you never want to forget.

## Quick start

Open `index.html` in a browser.

**Two modes:**

1. **Demo mode (default)** — no configuration needed. The partner is simulated locally so you can walk the whole experience alone.
2. **Supabase mode (real rooms)** — paste your credentials into `js/config.js` and any two devices can join the same room in real time.

## Project structure

```
index.html          markup + screens (home · create · join · invite · lobby · play · wait · reveal · discoveries)
css/styles.css       dark wine/ivory design system + responsive rules
js/config.js         Supabase URL/key + room code settings + mode detection
js/questions.js      question bank with metadata (depth, intimacy) + demo answers
js/store.js          state machine + two backends (Supabase Realtime / local demo)
js/app.js            renders whatever Store.state says; wires all buttons
supabase/schema.sql  tables + RLS (rooms, participants, sessions, questions, answers, discoveries)
supabase/seed.sql    32-question bank seed
```

## The state machine

```
WAITING_FOR_PARTNER  →  BOTH_CONNECTED  →  ANSWERING  →  ONE_READY  →  BOTH_READY  →  REVEAL
```

`store.js` owns the machine; `app.js` only renders `Store.state.screen`.

## Real-mode setup (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run `supabase/schema.sql`, then `supabase/seed.sql`.
3. Copy your **Project URL** and **anon key** (Project Settings → API).
4. Paste them into `js/config.js` (`supabaseUrl`, `supabaseAnonKey`).
5. Serve it on any static host (Netlify/Vercel/GitHub Pages) or `npx serve`. Open the page in two browsers/devices, create a room in one, join with the code in the other.

> Supabase Realtime streams room/session/answer changes to both devices. Presence shows when your partner is actually connected.

## Product position

- **Not a dating app.** Relationship discovery for an existing couple — you create a room together, answer the same question without seeing each other, then reveal.
- Answers respect privacy and boundaries: **"I'd rather not answer"** and **"I don't know yet"** are first-class options, not failures.
- Saved discoveries persist in `localStorage`; later versions will move them into the discoveries table per participant.

## Security roadmap

RLS is currently permissive (anon reads/writes) because there are no accounts yet — the room code is the only boundary. Before launch, harden:

- Card **rate-limiting to prevent room-code guessing**
- **Room expiry** — rooms auto-close after e.g. 24 h
- Signed participant claims in the JWT so RLS can scope rows per participant
- Longer room codes

## Roadmap (from the original brief)

- **Phase 2 (this repo):** Supabase + real rooms, participant sessions, realtime reveals, near-simultaneous unlock, error/loading states. ✅
- **Phase 3:** smarter question engine (depth/stage metadata already seeded), conversation prompts, longer memory timeline, proper onboarding invite screen. Partially present.
- **Later:** accounts (keep history), premium question packs + date-night mode.

## OLD — prototype limitation (now addressed)

The first version simulated the partner with `localStorage` and a "Preview the reveal" stand-in. That behaviour remains available as demo mode; Supabase mode replaces it with real two-person rooms.