-- SEED_SCENARIO=after-ceremony (Codex R16, F003 § 4.2): the ceremony is over; the Homepage
-- ceremony countdown stops at 00 (F004).
-- Times are relative to the seed run, so the scenario works on any date.

delete from public.events;

insert into public.events (name, start_at, ceremony_at, venue, livestream_note)
values (
  'Sun* Annual Awards 2025',
  now() - interval '30 days',
  now() - interval '1 day',
  'Địa điểm tổ chức (dữ liệu mẫu)',
  'Livestream nội bộ cho Sunner ở xa (dữ liệu mẫu)'
);
