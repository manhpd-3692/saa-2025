-- Reference data loaded by `supabase db reset` (F002 D003, Codex R15).
-- Units (departments): display name + unique short code shown on profiles and kudo cards.
-- Codes follow the design (CECV1–3…); names are placeholders until the real unit list is given.
-- Event rows and demo activity come from the Go seed runner (backend/cmd/seed, SEED_SCENARIO).

insert into public.units (name, code)
values
  ('Đơn vị CECV1', 'CECV1'),
  ('Đơn vị CECV2', 'CECV2'),
  ('Đơn vị CECV3', 'CECV3'),
  ('Đơn vị CECV4', 'CECV4'),
  ('Đơn vị CECV5', 'CECV5')
on conflict (code) do update set name = excluded.name;
