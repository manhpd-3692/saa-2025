-- Migration 2/9 — users_units (F002 § 4.2; Codex R05, R15)
--
-- `users.role` is the single role source for every feature; there is no `profiles` table.
-- `users.id` is the Supabase auth user id. Rows are written only by the Go API (provision).

create type public.user_role as enum ('user', 'admin');

create table public.units (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) > 0),
  -- Short display code shown on profiles and kudo cards, e.g. `CECV2` (Codex R15).
  code text not null unique check (char_length(btrim(code)) > 0)
);

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Stored lower-cased; the domain rule (@sun-asterisk.com) is enforced by Go (G01, BR-003).
  email text not null unique check (email = lower(email)),
  name text not null,
  avatar_url text,
  role public.user_role not null default 'user',
  unit_id uuid references public.units (id) on delete set null,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

create index users_unit_id_idx on public.users (unit_id);
