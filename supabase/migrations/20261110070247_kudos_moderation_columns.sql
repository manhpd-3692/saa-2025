-- Migration 8/9 — kudos_moderation_columns (F011 § 4.2; Codex R13)
--
-- `moderation_version` is incremented on every real status change; admin decisions carry
-- `expectedVersion` and a mismatch answers 409 `stale_decision`.

alter table public.kudos
  add column moderation_version integer not null default 0 check (moderation_version >= 0),
  add column moderated_by uuid references public.users (id) on delete set null,
  add column moderated_at timestamptz;
