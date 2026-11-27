-- Migration 1/9 — roles_and_base_grants (F002 § 4.6 bootstrap contract, Codex R21)
--
-- The Go API connects as the dedicated role `saa_api`; it is the only data path to business
-- tables. The role is created NOLOGIN here: no password is ever committed. A login password is
-- set out-of-band — locally by `backend/scripts/dev-db-role.sql` (password from a psql variable),
-- on a hosted project by the operator.
--
-- Supabase Postgres roles live at cluster level, so the create is idempotent: a `db reset` that
-- keeps the cluster must not fail here, and it must not strip a local login set earlier.

do $$
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'saa_api') then
    create role saa_api nologin;
  end if;
end
$$;

-- BYPASSRLS: RLS is enabled deny-all on every business table (migration 9) as defence in depth;
-- Go enforces every rule. Hosted fallback if this grant is refused: explicit
-- `create policy ... to saa_api using (true) with check (true)` per table (phase-01 risk table).
-- (Only BYPASSRLS is set: touching SUPERUSER/REPLICATION needs a superuser, which `postgres` is not.)
alter role saa_api with bypassrls;

grant usage on schema public to saa_api;
