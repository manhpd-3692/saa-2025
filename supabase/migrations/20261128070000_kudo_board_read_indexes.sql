-- Live board read indexes (F006 A4, A6, A9; phase 7 review W4).
--
-- Public kudos received per Sunner: the Spotlight cloud, the hover card and the sidebar all count
-- `status = 'public'` kudos by receiver. Spam rows stay out of the index.
create index kudos_public_receiver_idx on public.kudos (receiver_id) where status = 'public';

-- "10 Sunner nhận quà mới nhất": DISTINCT ON (user_id) over opened boxes ordered by
-- user_id, opened_at desc, id desc is read straight from this index, with no sort.
create index secret_boxes_opened_user_idx on public.secret_boxes (user_id, opened_at desc, id desc)
  where opened_at is not null;
