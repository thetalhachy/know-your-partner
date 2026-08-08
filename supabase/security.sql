-- Know Your Partner · security hardening (phase 3A)
-- Run this in the SQL editor ON TOP of the existing tables.
-- Idempotent: safe to re-run.

-- ------------------------------------------------------------------
-- 1. Auth identity
--    Participants now identify via Supabase **anonymous auth** so every
--    row is scoped to auth.uid(). The client calls signInAnonymously()
--    (no email, invisible to the user). Room code = the invitation.
-- ------------------------------------------------------------------

-- ------------------------------------------------------------------
-- 2. Columns for rooms (creator + expiry) and participants (identity)
--    user_id = auth.uid() identifies the PERSON; id is just the row.
-- ------------------------------------------------------------------
alter table public.rooms
  add column if not exists creator_id uuid,
  add column if not exists expires_at timestamptz not null default now() + interval '12 hours';

alter table public.participants
  add column if not exists user_id uuid;

-- Backfill creator_id from the historical host participant (test data only).
update public.rooms r
  set creator_id = (select p.user_id from public.participants p
                    where p.room_id = r.id and p.is_host limit 1)
  where r.creator_id is null;

-- A person may sit in several rooms, but only once per room.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'participants_user_room_key'
  ) then
    alter table public.participants
      add constraint participants_user_room_key unique (user_id, room_id);
  end if;
end $$;

-- ------------------------------------------------------------------
-- 3. CHECK constraints: validate client-supplied data at the DB too
--    (DO blocks so re-running this file never errors.)
-- ------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'rooms_code_len') then
    alter table public.rooms add constraint rooms_code_len check (char_length(code) between 4 and 8);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rooms_status_ok') then
    alter table public.rooms add constraint rooms_status_ok check (status in ('waiting','active','closed','expired'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'participants_name_len') then
    alter table public.participants add constraint participants_name_len check (char_length(name) between 1 and 32);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'answers_text_len') then
    alter table public.answers add constraint answers_text_len check (char_length(answer) <= 600);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'answers_status_ok') then
    alter table public.answers add constraint answers_status_ok check (answer_status in ('answered','skipped','declined'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sessions_index_ok') then
    alter table public.sessions add constraint sessions_index_ok check (question_index >= 0);
  end if;
end $$;

-- ------------------------------------------------------------------
-- 4. Security helper (definer = bypasses RLS only for the lookup)
-- ------------------------------------------------------------------
create or replace function public.is_room_member(rid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.participants p
    where p.room_id = rid and p.user_id = auth.uid()
  );
$$;

create or replace function public.my_participant_id(rid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select p.id from public.participants p
  where p.room_id = rid and p.user_id = auth.uid()
  order by p.joined_at limit 1;
$$;

create or replace function public.can_join(rid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.rooms r
    where r.id = rid
      and r.status = 'waiting'
      and r.expires_at > now()
      and (select count(*) from public.participants p where p.room_id = rid) < 2
  );
$$;

create or replace function public.open_room_quota()
returns boolean language sql stable security definer set search_path = public as $$
  select (select count(*) from public.rooms r
          where r.creator_id = auth.uid() and r.status in ('waiting','active')) < 5;
$$;

-- ------------------------------------------------------------------
-- 5. Replace permissive policies with a scoped set
-- ------------------------------------------------------------------
drop policy if exists rooms_anon_io        on public.rooms;
drop policy if exists participants_anon_io on public.participants;
drop policy if exists sessions_anon_io     on public.sessions;
drop policy if exists questions_anon_io    on public.questions;
drop policy if exists answers_anon_io      on public.answers;
drop policy if exists discoveries_anon_io  on public.discoveries;
drop policy if exists rooms_select         on public.rooms;
drop policy if exists rooms_insert         on public.rooms;
drop policy if exists rooms_update         on public.rooms;
drop policy if exists rooms_delete         on public.rooms;
drop policy if exists participants_select  on public.participants;
drop policy if exists participants_insert  on public.participants;
drop policy if exists participants_update  on public.participants;
drop policy if exists participants_delete  on public.participants;
drop policy if exists sessions_select      on public.sessions;
drop policy if exists sessions_insert      on public.sessions;
drop policy if exists sessions_update      on public.sessions;
drop policy if exists sessions_delete      on public.sessions;
drop policy if exists answers_select       on public.answers;
drop policy if exists answers_insert       on public.answers;
drop policy if exists answers_update       on public.answers;
drop policy if exists answers_delete       on public.answers;
drop policy if exists discoveries_select   on public.discoveries;
drop policy if exists discoveries_insert   on public.discoveries;
drop policy if exists discoveries_delete   on public.discoveries;
drop policy if exists questions_select     on public.questions;

alter table public.rooms        enable row level security;
alter table public.participants enable row level security;
alter table public.sessions     enable row level security;
alter table public.questions    enable row level security;
alter table public.answers      enable row level security;
alter table public.discoveries  enable row level security;

-- rooms -------------------------------------------------
-- SELECT any OPEN (waiting, not expired) room — the invite lookup; only
-- your own rooms once they are active. Nobody else's active data.
create policy rooms_select on public.rooms for select
  using (creator_id = auth.uid()
      or is_room_member(id)
      or (status = 'waiting' and expires_at > now()));

create policy rooms_insert on public.rooms for insert
  with check (creator_id = auth.uid() and open_room_quota());

create policy rooms_update on public.rooms for update
  using (creator_id = auth.uid() or is_room_member(id))
  with check (creator_id = auth.uid() or is_room_member(id));

create policy rooms_delete on public.rooms for delete
  using (creator_id = auth.uid());

-- participants -------------------------------------------------------
-- You can see people in your rooms; you can only insert YOURSELF into an
-- open room that hasn't started (<2 people, status waiting, unexpired).
create policy participants_select on public.participants for select
  using (user_id = auth.uid() or is_room_member(room_id));

create policy participants_insert on public.participants for insert
  with check (
    user_id = auth.uid()
    and can_join(room_id)
  );

create policy participants_update on public.participants for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy participants_delete on public.participants for delete
  using (user_id = auth.uid());

-- sessions -----------------------------------------------------------
-- Any member may start or advance a session; started_by is filled by the
-- client and is informational.
create policy sessions_select on public.sessions for select
  using (is_room_member(room_id));

create policy sessions_insert on public.sessions for insert
  with check (is_room_member(room_id));

create policy sessions_update on public.sessions for update
  using (is_room_member(room_id));

create policy sessions_delete on public.sessions for delete
  using (is_room_member(room_id));

-- answers ------------------------------------------------------------
-- Someone may SELECT their own + their partner's answers (for the
-- reveal) but only inside rooms they both belong to; they can only
-- write their OWN answer (their own participant row in that room).
create policy answers_select on public.answers for select
  using (exists (select 1 from public.sessions s
                 where s.id = answers.session_id and is_room_member(s.room_id)));

create policy answers_insert on public.answers for insert
  with check (
    participant_id = my_participant_id((select room_id from public.sessions s where s.id = answers.session_id))
    and exists (select 1 from public.sessions s
                where s.id = answers.session_id and is_room_member(s.room_id)));

create policy answers_update on public.answers for update
  using (participant_id = my_participant_id((select room_id from public.sessions s where s.id = answers.session_id)))
  with check (
    participant_id = my_participant_id((select room_id from public.sessions s where s.id = answers.session_id)));

create policy answers_delete on public.answers for delete
  using (participant_id = my_participant_id((select room_id from public.sessions s where s.id = answers.session_id)));

-- discoveries ---------------------------------------------------------
create policy discoveries_select on public.discoveries for select
  using (is_room_member(room_id) or saved_by = my_participant_id(room_id));

create policy discoveries_insert on public.discoveries for insert
  with check (
    saved_by = my_participant_id(room_id)
    and is_room_member(room_id));

create policy discoveries_delete on public.discoveries for delete
  using (saved_by = my_participant_id(room_id));

-- questions -----------------------------------------------------------
-- Public read-only question bank; anonymous clients never write to it.
create policy questions_select on public.questions for select
  using (true);

-- ------------------------------------------------------------------
-- 6. Abandoned rooms: join-time checks (can_join) already reject
--    expired/closed rooms. Optional auto-expiry via pg_cron:
-- ------------------------------------------------------------------
-- create extension if not exists pg_cron;
-- select cron.schedule('kyp-expire', '* */6 * * *',
--   $$update public.rooms set status='expired'
--     where status in ('waiting','active') and expires_at < now()$$);