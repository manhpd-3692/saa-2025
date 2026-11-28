-- Admin user directory order (F010 A4, A5, A6; phase 11 review W3).
--
-- AdminListUsers orders Sunners by (name, id) with a LIMIT, and the streamed CSV export reads the
-- next page on the same (name, id) keyset. With this index Postgres reads users already in order
-- and stops at the page, so the per-user aggregates (kudos, hearts, badges) run for one page
-- instead of every Sunner. Scaled EXPLAIN (20,000 Sunners, 60,000 kudos): first table page
-- 859 ms -> 1.8 ms, one 500-row export page 377 ms -> 28 ms.
create index users_name_id_idx on public.users (name, id);
