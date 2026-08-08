-- Know Your Partner · Supabase schema (v1)
-- Run this in the Supabase SQL editor.
--
-- Restart identity is not used: this project uses Supabase's anonymous
-- (anon) role without user accounts. The room code is the shared secret;
-- participants identify themselves with a client-generated participant id
-- stored in localStorage. Security hardening (expiry, rate-limiting, real
-- auth, per-row RLS keyed on a signed participant claim) is planned for
-- phase 2 of the project — see comments below.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------
-- rooms
-- ---------------------------------------------------------------
create table if not exists public.rooms (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  status        text not null default 'waiting',          -- waiting | active | closed | expired
  creator_name  text not null default '',
  partner_name  text not null default '',
  creator_id    uuid,                                     -- auth.uid() of host (see security.sql)
  expires_at    timestamptz not null default now() + interval '12 hours',
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- participants — one row per person who joined a room.
-- `id` is generated on the client so a participant can re-attach
-- to their own row after a reload.
-- ---------------------------------------------------------------
create table if not exists public.participants (
  id            uuid primary key,
  room_id       uuid not null references public.rooms(id) on delete cascade,
  name          text not null,
  is_host       boolean not null default false,
  joined_at     timestamptz not null default now()
);

create index if not exists idx_participants_room on public.participants(room_id);

-- ---------------------------------------------------------------
-- sessions — one active question session per room (a category run).
-- question_index points at the current question inside that category.
-- ---------------------------------------------------------------
create table if not exists public.sessions (
  id             uuid primary key default gen_random_uuid(),
  room_id        uuid not null references public.rooms(id) on delete cascade,
  category       text not null,
  question_index integer not null default 0,
  started_by     uuid references public.participants(id),
  created_at     timestamptz not null default now(),
  unique (room_id, category)
);

-- ---------------------------------------------------------------
-- questions — the question bank. Seeded from supabase/seed.sql.
-- Adds the metadata the "better question engine" (phase 3) wants:
-- depth, relationship_stage, intimacy_level.
-- ---------------------------------------------------------------
create table if not exists public.questions (
  id                uuid primary key default gen_random_uuid(),
  category          text not null,
  question          text not null,
  depth             smallint not null default 1,   -- general (1) .. very deep (3)
  relationship_stage text default 'any',           -- new | any | long | married
  intimacy_level    smallint not null default 1,   -- 1 .. 3
  ordering          integer
);

-- ---------------------------------------------------------------
-- answers — each participant answers the same question instance.
-- answer_status: answered | skipped | declined
-- unique(participant_id, session_id, question_index) so answers
-- are honored and updated in place.
-- ---------------------------------------------------------------
create table if not exists public.answers (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references public.sessions(id) on delete cascade,
  room_id        uuid not null references public.rooms(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  question_index integer not null,
  answer         text not null default '',
  answer_status  text not null default 'answered',  -- answered | skipped | declined
  created_at     timestamptz not null default now(),
  unique (participant_id, session_id, question_index)
);

create index if not exists idx_answers_session on public.answers(session_id);

-- ---------------------------------------------------------------
-- discoveries — things someone chose to keep ("keep this").
-- Stores a snapshot so history survives question-bank edits.
-- ---------------------------------------------------------------
create table if not exists public.discoveries (
  id             uuid primary key default gen_random_uuid(),
  room_id        uuid not null references public.rooms(id) on delete cascade,
  session_id     uuid references public.sessions(id) on delete cascade,
  saved_by       uuid not null references public.participants(id) on delete cascade,
  category       text not null,
  question       text not null,
  question_index integer not null,
  my_answer      text not null,
  partner_answer text not null,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Row Level Security
--
-- Phase 1: no accounts yet, so policies are intentionally permissive.
-- The room code is the only boundary between "you" and a stranger.
-- Stronger per-row policies (signed participant claim in the JWT) are
-- the phase-2 upgrade path; see README "Security roadmap".
-- ---------------------------------------------------------------
alter table public.rooms        enable row level security;
alter table public.participants enable row level security;
alter table public.sessions     enable row level security;
alter table public.questions    enable row level security;
alter table public.answers      enable row level security;
alter table public.discoveries  enable row level security;

create policy "rooms_anon_io"        on public.rooms        for all to anon using (true) with check (true);
create policy "participants_anon_io" on public.participants for all to anon using (true) with check (true);
create policy "sessions_anon_io"     on public.sessions     for all to anon using (true) with check (true);
create policy "questions_anon_io"    on public.questions    for all to anon using (true) with check (true);
create policy "answers_anon_io"      on public.answers      for all to anon using (true) with check (true);
create policy "discoveries_anon_io"  on public.discoveries  for all to anon using (true) with check (true);

-- ---------------------------------------------------------------
-- Realtime
-- Every table must belong to the supabase_realtime publication or
-- no change events are broadcast to subscribers. If this errors on
-- an existing project, drop it and re-run (or use the dashboard's
-- per-table Realtime toggle).
-- ---------------------------------------------------------------
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.participants;
alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.questions;
alter publication supabase_realtime add table public.answers;
alter publication supabase_realtime add table public.discoveries;