# Know Your Partner

> **You know them. But there is always more to discover.**

Know Your Partner is a private two-person discovery game designed to help couples discover things they don't already know about each other.

It's not a compatibility test.
It's not a relationship score.
It's not about getting the most answers right.

It's about the moment when you look at your partner and think:

> **“I didn't know that about you.”**

---

## How It Works

Two people join the same private room and answer questions independently.

```text
QUESTION
   ↓
PRIVATE ANSWERS
   ↓
BOTH COMMIT
   ↓
SYNCHRONIZED REVEAL
   ↓
DISCOVERY
   ↓
CONVERSATION
   ↓
NEXT QUESTION
```

The difference between two answers isn't a failure.

**It's often the most interesting part.**

For example:

> **Where would you live for a year if you could go anywhere?**

**You:** Tokyo
**Them:** A small town in Italy

That's not a wrong answer.

That's something you just learned about each other.

---

## Core Philosophy

### Discovery over matching

Know Your Partner does **not** try to prove that two people are compatible because they think alike.

We don't want:

* Compatibility scores
* Correct/incorrect scoring
* Match percentages
* “Perfect couple” scores
* Leaderboards
* Relationship rankings

A mismatch can be a great outcome.

The product rewards **curiosity, surprise, and discovery**.

### The answer is the reward

The experience is built around a simple idea:

> **The goal isn't to prove how well you know each other. The goal is to keep discovering each other.**

---

## What We're Building

### Core Gameplay

* Private two-person rooms
* Independent answers
* Simultaneous reveal
* Discovery-focused outcomes
* Optional conversation prompts
* Session progression
* End-of-session discovery summary

### Question Engine

Questions are designed to reveal:

* Everyday preferences
* Memories
* Personality
* Values
* Future plans
* Relationship perspectives
* Playful answers
* Vulnerability
* Predictions
* Unexpected opinions

Questions are also organized by depth:

```text
1 — Light
2 — Familiar
3 — Personal
4 — Deep
5 — Vulnerable
```

The session should gradually move from easy conversation toward deeper discovery.

### Discovery History

A planned feature will allow users to save meaningful discoveries:

> **Things I learned about you**

* You'd live in Lisbon for a year.
* You want to learn piano.
* You'd choose more free time over more money.

The long-term goal is to turn individual sessions into a private collection of things you've learned about each other.

---

## Current Status

**Stage:** Working MVP → Productization → Private Beta

The current version already supports the fundamental two-person experience:

* Room creation
* Partner joining
* Anonymous authentication
* Private two-person rooms
* Presence
* Realtime synchronization
* Simultaneous answer/reveal flow
* “I'd rather not” handling
* “I don't know yet” handling

The next stage is making the experience feel like a complete product rather than simply a working multiplayer system.

---

## Roadmap

The product is being developed across seven areas.

### 01 — Core Gameplay

Make the actual experience excellent.

* [ ] Discovery-focused reveal
* [ ] Conversation prompts
* [ ] Session progression
* [ ] Better completion experience
* [ ] Discovery summary

### 02 — UI / UX

Make the experience beautiful, intimate, and effortless.

* [ ] Refine onboarding
* [ ] Refine waiting state
* [ ] Refine question experience
* [ ] Refine answer state
* [ ] Redesign reveal experience
* [ ] Improve transitions
* [ ] Mobile optimization

### 03 — Content & Question Engine

Make the questions genuinely worth answering.

* [ ] Structured question database
* [ ] Initial 100+ question library
* [ ] Categories
* [ ] Depth levels
* [ ] Discovery potential
* [ ] Conversation potential
* [ ] Adaptive question selection

### 04 — Technical Infrastructure

Make the system reliable.

* [ ] State-machine audit
* [ ] Realtime reliability
* [ ] Reconnect handling
* [ ] Error recovery
* [ ] Performance monitoring
* [ ] Reproducible database migrations

### 05 — Trust, Security & Privacy

Protect the information people share.

* [ ] Full RLS audit
* [ ] Cross-room authorization testing
* [ ] Answer privacy testing
* [ ] Anonymous-auth abuse protection
* [ ] Data retention policy
* [ ] Data deletion
* [ ] Privacy Policy
* [ ] Terms of Service

### 06 — Product Intelligence & Growth

Understand whether the product is actually creating value.

Planned metrics include:

* Room creation
* Partner join rate
* Question completion
* Discovery rate
* Conversation rate
* Session completion
* Replay rate
* Sharing
* Retention

Question-level analytics will eventually help identify which questions consistently create meaningful discoveries.

### 07 — Testing & Beta

Validate the product with real couples.

```text
10 couples
    ↓
Fix major issues
    ↓
25 couples
    ↓
Improve product
    ↓
50 couples
    ↓
Evaluate public launch
```

---

## Tech Stack

### Frontend

* React
* TypeScript
* Vite

### Backend

* Supabase

  * PostgreSQL
  * Authentication
  * Realtime

### Authentication

The current product uses anonymous authentication to minimize signup friction while still giving each participant a distinct identity.

---

## Architecture

High-level architecture:

```text
┌─────────────────┐
│    Browser A    │
└────────┬────────┘
         │
         │
┌────────▼────────┐
│    Web App      │
│ React + TS      │
└────────┬────────┘
         │
         │
┌────────▼────────────────────┐
│           Supabase          │
│                             │
│  Auth                       │
│  PostgreSQL                 │
│  Realtime                   │
└────────▲────────────────────┘
         │
         │
┌────────┴────────┐
│    Browser B    │
└─────────────────┘
```

The multiplayer game is modeled around explicit states:

```text
LOBBY
  ↓
BOTH_PRESENT
  ↓
QUESTION_ACTIVE
  ↓
WAITING_FOR_ANSWERS
  ↓
REVEAL
  ↓
DISCUSSION
  ↓
NEXT_QUESTION
  ↓
COMPLETED
```

---

## Privacy & Security

Know Your Partner can involve personal and intimate information, so privacy is a core product requirement rather than an afterthought.

The system is designed around:

* Private rooms
* Two-person authorization
* Row Level Security
* Private answers before reveal
* Room-level access control
* Minimal data retention
* Anonymous authentication
* Future data deletion controls

Before public launch, the production environment will undergo a dedicated security and authorization audit.

---

## Product Principles

### 1. Don't judge the relationship

KYP should never tell people whether their relationship is good or bad.

### 2. Don't punish a mismatch

A different answer can be the most valuable answer.

### 3. Create curiosity

Questions should make people genuinely interested in what their partner will say.

### 4. Get people talking

The interface should eventually disappear into the conversation.

### 5. Protect vulnerability

If people are going to share personal things, the product needs to earn their trust.

### 6. Keep it intimate

KYP should feel like something two people do together — not another social network.

---

## What KYP Is Not

Know Your Partner is intentionally **not**:

* A dating app
* A matchmaking service
* A compatibility calculator
* A relationship diagnostic
* A social network
* A competitive quiz
* A leaderboard
* A personality test

The product is about **discovery between two people**.

---

## Long-Term Direction

The long-term vision is bigger than a question game.

A session starts with:

> **“Let's play.”**

It should end with:

> **“I learned something about you.”**

And over time:

> **“I know you better because we've kept discovering each other.”**

Potential future experiences include:

* Date-night sessions
* Anniversary experiences
* Long-distance sessions
* Newlywed experiences
* Deep question packs
* Occasion-specific experiences
* Persistent discovery history
* Personalized question sessions

These are future possibilities, not current product commitments.

---

## Development Philosophy

Don't build the entire product layer-by-layer in isolation.

Build **vertical slices**.

The most important slice is:

```text
Question
   ↓
Answer
   ↓
Wait
   ↓
Reveal
   ↓
Discovery
   ↓
Conversation
   ↓
Next
```

Make that moment excellent.

Then expand outward.

---

## Contributing

This project is currently in an early product-development stage.

The repository may evolve quickly as the MVP becomes a production-ready product.

Before making significant architectural changes, preserve the core principle:

> **The goal is not to prove how well two people know each other. The goal is to keep discovering each other.**

---

## License

License information will be added before public distribution.

---

## The One-Sentence Version

**Know Your Partner is a private two-person discovery game that helps couples uncover what they don't already know about each other.**

> **You know them. But there is always more to discover.**
