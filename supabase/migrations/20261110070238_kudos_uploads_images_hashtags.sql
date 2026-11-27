-- Migration 4/9 — kudos_uploads_images_hashtags (F005 § 4.2; Codex R01, R03, R04, N02)

-- `public` is listed everywhere; `spam` is hidden from other Sunners (F011 owns status changes).
create type public.kudo_status as enum ('public', 'spam');

-- Upload lifecycle, one direction only: pending -> attached -> pending_delete (Codex N02).
create type public.kudo_upload_state as enum ('pending', 'attached', 'pending_delete');

create table public.kudos (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users (id),
  receiver_id uuid not null references public.users (id),
  -- Max 100 characters (BR-004); Go validates first, this is the backstop.
  title text not null check (char_length(title) between 1 and 100),
  -- Sanitized HTML as stored by Go; the 1,000 code point rule applies to its visible text (R20).
  content text not null,
  is_anonymous boolean not null default false,
  status public.kudo_status not null default 'public',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- BR-001: a kudo cannot be sent to yourself.
  constraint kudos_sender_not_receiver check (sender_id <> receiver_id)
);

create index kudos_receiver_created_idx on public.kudos (receiver_id, created_at desc, id);
create index kudos_sender_created_idx on public.kudos (sender_id, created_at desc, id);
-- Board and moderation lists (F006, F011): newest first, optionally filtered by status.
create index kudos_created_idx on public.kudos (created_at desc, id);
create index kudos_status_created_idx on public.kudos (status, created_at desc, id);

-- Server-only ownership of one uploaded image. Object key `kudo-images/{uploadId}.{ext}`:
-- opaque, write-once, no user id anywhere (Codex R01). `owner_id` is never exposed to readers.
create table public.kudo_uploads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id),
  object_path text not null unique,
  mime text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  created_at timestamptz not null default now(),
  state public.kudo_upload_state not null default 'pending',
  -- Null while pending, set once on attach, kept on pending_delete (Codex N02).
  kudo_id uuid references public.kudos (id),
  attached_at timestamptz,
  constraint kudo_uploads_kudo_matches_state check ((state = 'pending') = (kudo_id is null)),
  constraint kudo_uploads_attached_at_matches_state check ((state = 'pending') = (attached_at is null))
);

create index kudo_uploads_owner_idx on public.kudo_uploads (owner_id);
create index kudo_uploads_kudo_idx on public.kudo_uploads (kudo_id);

-- Ordered attachments (0-based position, max 5 per kudo). The current rows are the only source
-- of a kudo's images; readers join kudo_uploads filtered to state = 'attached' (Codex N02).
create table public.kudo_images (
  id uuid primary key default gen_random_uuid(),
  kudo_id uuid not null references public.kudos (id) on delete cascade,
  upload_id uuid not null unique references public.kudo_uploads (id),
  position smallint not null check (position between 0 and 4),
  constraint kudo_images_kudo_position_key unique (kudo_id, position)
);

-- Names are normalized by Go: trimmed, lower-cased, leading `#` stripped (BR-002).
create table public.hashtags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  constraint hashtags_name_normalized check (
    char_length(name) > 0 and name = lower(btrim(name)) and left(name, 1) <> '#'
  )
);

create table public.kudo_hashtags (
  kudo_id uuid not null references public.kudos (id) on delete cascade,
  hashtag_id uuid not null references public.hashtags (id),
  primary key (kudo_id, hashtag_id)
);

create index kudo_hashtags_hashtag_idx on public.kudo_hashtags (hashtag_id);
