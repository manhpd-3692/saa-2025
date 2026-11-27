-- Migration 3/9 — events (F003 § 4.2, G03, G13, AD14)
--
-- One current row for SAA 2025, written only by seed scripts (backend/db/seeds, SEED_SCENARIO).
-- `start_at` = site opens (countdown page + launch gate target);
-- `ceremony_at` = Homepage ceremony countdown target (F004).

create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) > 0),
  start_at timestamptz not null,
  ceremony_at timestamptz not null,
  venue text,
  livestream_note text,
  created_at timestamptz not null default now(),
  constraint events_ceremony_not_before_start check (ceremony_at >= start_at)
);
