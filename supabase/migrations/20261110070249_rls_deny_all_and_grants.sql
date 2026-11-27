-- Migration 9/9 — rls_deny_all_and_grants (F002 § 4.6 bootstrap contract, Codex R21, G18)
--
-- Go (role `saa_api`) is the only data path. Browser roles get nothing:
--   * RLS enabled with NO policies (deny-all) on every business table — defence in depth;
--   * `anon` and `authenticated` hold no grants on business tables or the `kudo_heart_state` view.
-- `service_role` is revoked too: the Storage service key held by Go must not open PostgREST
-- access to business data (hardening beyond R21, which names anon/authenticated).
-- A new business table must be added to all three lists below in its own migration.

alter table public.units enable row level security;
alter table public.users enable row level security;
alter table public.events enable row level security;
alter table public.kudos enable row level security;
alter table public.kudo_uploads enable row level security;
alter table public.kudo_images enable row level security;
alter table public.hashtags enable row level security;
alter table public.kudo_hashtags enable row level security;
alter table public.campaigns enable row level security;
alter table public.hearts enable row level security;
alter table public.secret_boxes enable row level security;
alter table public.notifications enable row level security;

revoke all on table
  public.units,
  public.users,
  public.events,
  public.kudos,
  public.kudo_uploads,
  public.kudo_images,
  public.hashtags,
  public.kudo_hashtags,
  public.campaigns,
  public.hearts,
  public.secret_boxes,
  public.notifications,
  public.kudo_heart_state
from anon, authenticated, service_role;

grant select, insert, update, delete on table
  public.units,
  public.users,
  public.events,
  public.kudos,
  public.kudo_uploads,
  public.kudo_images,
  public.hashtags,
  public.kudo_hashtags,
  public.campaigns,
  public.hearts,
  public.secret_boxes,
  public.notifications
to saa_api;

grant select on table public.kudo_heart_state to saa_api;

-- Hosted projects grant browser roles on new public tables by default; turn that off so a later
-- migration cannot silently expose a table (local config also sets auto_expose_new_tables=false).
alter default privileges in schema public revoke all on tables from anon, authenticated, service_role;
alter default privileges in schema public revoke all on sequences from anon, authenticated, service_role;
alter default privileges in schema public revoke all on functions from anon, authenticated, service_role;
