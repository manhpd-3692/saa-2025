-- Migration 5/9 — campaigns (F012 § 4.2, G14)
--
-- One heart-boost promotion; owned and written only by F012 (admin), read by F008 at heart time.
-- Overlapping campaigns are allowed; F008 applies the highest active multiplier.

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  multiplier integer not null default 2 check (multiplier between 2 and 10),
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_ends_after_starts check (ends_at > starts_at)
);
