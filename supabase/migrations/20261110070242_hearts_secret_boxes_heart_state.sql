-- Migration 6/9 — hearts_secret_boxes_heart_state (F008 § 4.2; G07, G08, G09; Codex R11, R12, N12, C05)

-- The six collectible icons; null on secret_boxes.icon = unopened box.
create type public.secret_box_icon as enum (
  'REVIVAL',
  'TOUCH_OF_LIGHT',
  'STAY_GOLD',
  'FLOW_TO_HORIZON',
  'BEYOND_THE_BOUNDARY',
  'ROOT_FURTHER'
);

-- One Sunner's heart on one kudo. `weight` and `campaign_id` are fixed at heart time (G08);
-- deleting a campaign keeps the heart and its weight (X04).
create table public.hearts (
  id uuid primary key default gen_random_uuid(),
  kudo_id uuid not null references public.kudos (id) on delete cascade,
  user_id uuid not null references public.users (id),
  weight integer not null check (weight >= 1),
  campaign_id uuid references public.campaigns (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint hearts_kudo_user_key unique (kudo_id, user_id)
);

create index hearts_user_idx on public.hearts (user_id);

-- One earned box. `seq` is the high-water mark counter (BR-006): top-ups only insert above
-- max(seq). `open_request_id` = Idempotency-Key of the open (R12); `open_result` = the exact
-- response replayed for that key (N12).
create table public.secret_boxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id),
  seq integer not null check (seq >= 1),
  earned_at timestamptz not null default now(),
  opened_at timestamptz,
  icon public.secret_box_icon,
  open_request_id uuid unique,
  open_result jsonb,
  constraint secret_boxes_user_seq_key unique (user_id, seq),
  constraint secret_boxes_icon_matches_opened check ((opened_at is null) = (icon is null)),
  constraint secret_boxes_open_fields_need_opened check (
    opened_at is not null or (open_request_id is null and open_result is null)
  )
);

-- First time a Sunner holds all six icons; set once by the box-open transaction (C05, R11).
alter table public.users add column icons_completed_at timestamptz;

-- Weighted heart total per kudo (G08): the one number behind displayed hearts, box progress,
-- Highlight ranking and admin totals. A SQL view, not a function (Codex R14); every kudo has a
-- row (0 when it has no heart). security_invoker: callers need their own grants on the tables.
create view public.kudo_heart_state
with (security_invoker = true) as
select
  k.id as kudo_id,
  coalesce(sum(h.weight), 0)::bigint as heart_total
from public.kudos k
left join public.hearts h on h.kudo_id = k.id
group by k.id;
