-- LOCAL DEVELOPMENT ONLY: let the Go API role `saa_api` log in (Codex R21).
-- Migration `roles_and_base_grants` creates the role NOLOGIN; no password is ever committed.
-- The password comes from a psql variable, e.g. (from the repo root, see backend/README.md):
--
--   docker exec -i supabase_db_saa-2025 psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
--     -v saa_api_password="$SAA_API_DB_PASSWORD" < backend/scripts/dev-db-role.sql
--
-- Re-run it after any `supabase db reset` that recreates the cluster.

\if :{?saa_api_password}
\else
  \set saa_api_password ''
\endif

select length(:'saa_api_password') >= 16 as saa_api_password_ok \gset

\if :saa_api_password_ok
  alter role saa_api with login password :'saa_api_password';
  \echo 'saa_api can now log in.'
\else
  do $$
  begin
    raise exception 'Pass -v saa_api_password=<at least 16 characters> (e.g. from $SAA_API_DB_PASSWORD).';
  end
  $$;
\endif
