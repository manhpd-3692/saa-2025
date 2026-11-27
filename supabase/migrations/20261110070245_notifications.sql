-- Migration 7/9 — notifications (F009 § 4.2; G10; Codex R02, R14, N01, N03)

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.users (id),
  -- Exactly the seven kinds; no `review_requested` (G10) and no old `spam_warning` (R14).
  kind text not null check (
    kind in (
      'kudo_received',
      'heart_received',
      'secret_box_received',
      'hero_level_up',
      'kudo_spam_warning',
      'icons_completed',
      'generic'
    )
  ),
  params jsonb not null default '{}'::jsonb check (jsonb_typeof(params) = 'object'),
  kudo_id uuid references public.kudos (id) on delete set null,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  -- Once-ever kinds must carry a dedupe key, or the permanent unique index cannot apply (N03).
  constraint notifications_once_ever_needs_dedupe check (
    kind not in ('hero_level_up', 'icons_completed') or dedupe_key is not null
  )
);

-- Panel list, newest first with keyset tiebreak.
create index notifications_recipient_feed_idx
  on public.notifications (recipient_id, created_at desc, id desc);

-- Unread count and mark-all-read.
create index notifications_recipient_unread_idx
  on public.notifications (recipient_id)
  where read_at is null;

-- Sender redaction when a kudo turns anonymous (R02) and the re-mask join.
create index notifications_kudo_idx on public.notifications (kudo_id);

-- Once-ever kinds: permanent, independent of read_at; inserts use `on conflict do nothing` (N03).
create unique index notifications_once_ever_dedupe_key
  on public.notifications (recipient_id, dedupe_key)
  where kind in ('hero_level_up', 'icons_completed');

-- Every other kind merges into an existing unread notice with the same dedupe key (BR-004).
create unique index notifications_unread_dedupe_key
  on public.notifications (recipient_id, dedupe_key)
  where read_at is null
    and dedupe_key is not null
    and kind not in ('hero_level_up', 'icons_completed');
