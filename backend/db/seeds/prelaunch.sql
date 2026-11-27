-- SEED_SCENARIO=prelaunch (Codex R16, F003 § 4.2): the site has not opened yet.
-- Demonstrates the launch-gate redirect and the live countdown page (F003).
-- Times are relative to the seed run, so the scenario works on any date.

delete from public.events;

insert into public.events (name, start_at, ceremony_at, venue, livestream_note)
values (
  'Sun* Annual Awards 2025',
  now() + interval '2 days',
  now() + interval '20 days',
  'Địa điểm tổ chức (dữ liệu mẫu)',
  'Livestream nội bộ cho Sunner ở xa (dữ liệu mẫu)'
);
