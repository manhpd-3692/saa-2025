-- SEED_SCENARIO=live — the default (Codex R16, F003 § 4.2): the site is open and the
-- Homepage ceremony countdown is running (F004).
-- Times are relative to the seed run, so the scenario works on any date.

delete from public.events;

insert into public.events (name, start_at, ceremony_at, venue, livestream_note)
values (
  'Sun* Annual Awards 2025',
  now() - interval '1 day',
  now() + interval '14 days',
  'Địa điểm tổ chức (dữ liệu mẫu)',
  'Livestream nội bộ cho Sunner ở xa (dữ liệu mẫu)'
);
