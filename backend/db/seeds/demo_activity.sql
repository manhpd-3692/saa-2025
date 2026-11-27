-- Demo activity for LOCAL development (Codex R16): Sunners, kudos, hearts and secret boxes,
-- all dated within the last 14 days so the admin Overview's last-30-days default shows data.
-- Run by `go run ./cmd/seed` after the scenario file, in the same transaction.
-- Idempotent: the previous demo rows are removed first. Writes auth.users (users.id references
-- it), so it needs the local owner connection and must never run against a hosted project.

create temp table demo_people (
  n integer primary key,
  id uuid not null unique,
  email text not null,
  name text not null,
  unit_code text not null
) on commit drop;

insert into demo_people (n, id, email, name, unit_code) values
  (1, 'd0000000-0000-4000-8000-000000000001', 'sunner01.demo@sun-asterisk.com', 'Nguyễn Văn An', 'CECV1'),
  (2, 'd0000000-0000-4000-8000-000000000002', 'sunner02.demo@sun-asterisk.com', 'Trần Thị Bình', 'CECV1'),
  (3, 'd0000000-0000-4000-8000-000000000003', 'sunner03.demo@sun-asterisk.com', 'Lê Minh Châu', 'CECV2'),
  (4, 'd0000000-0000-4000-8000-000000000004', 'sunner04.demo@sun-asterisk.com', 'Phạm Quốc Dũng', 'CECV2'),
  (5, 'd0000000-0000-4000-8000-000000000005', 'sunner05.demo@sun-asterisk.com', 'Hoàng Thu Hà', 'CECV3'),
  (6, 'd0000000-0000-4000-8000-000000000006', 'sunner06.demo@sun-asterisk.com', 'Vũ Đức Khang', 'CECV3'),
  (7, 'd0000000-0000-4000-8000-000000000007', 'sunner07.demo@sun-asterisk.com', 'Đặng Mai Linh', 'CECV4'),
  (8, 'd0000000-0000-4000-8000-000000000008', 'sunner08.demo@sun-asterisk.com', 'Bùi Thanh Nam', 'CECV5');

-- 1. Remove the previous demo activity, children before parents.
delete from public.notifications where recipient_id in (select id from demo_people);
delete from public.secret_boxes where user_id in (select id from demo_people);
delete from public.hearts where user_id in (select id from demo_people);
delete from public.kudo_images where kudo_id in (
  select id from public.kudos
  where sender_id in (select id from demo_people) or receiver_id in (select id from demo_people)
);
delete from public.kudo_uploads where owner_id in (select id from demo_people);
delete from public.kudos
where sender_id in (select id from demo_people) or receiver_id in (select id from demo_people);
delete from auth.users where id in (select id from demo_people); -- cascades public.users

-- 2. Identities: verified Google accounts on the company domain (they cannot sign in locally).
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select
  '00000000-0000-0000-0000-000000000000', p.id, 'authenticated', 'authenticated', p.email, '',
  now() - interval '13 days', now() - make_interval(hours => p.n * 5),
  '', '', '', '',
  jsonb_build_object('provider', 'google', 'providers', jsonb_build_array('google')),
  jsonb_build_object('email_verified', true, 'full_name', p.name, 'name', p.name),
  now() - interval '13 days', now() - interval '13 days'
from demo_people p;

-- 3. Profiles (role user; admins come from ADMIN_EMAILS on a real sign-in, G02).
insert into public.users (id, email, name, avatar_url, role, unit_id, last_login_at, created_at)
select p.id, p.email, p.name, null, 'user', u.id, now() - make_interval(hours => p.n * 5),
       now() - interval '13 days'
from demo_people p
join public.units u on u.code = p.unit_code;

-- 4. Kudos between demo Sunners (public, sanitized HTML), 3 hours to 13 days old.
create temp table demo_kudos (
  n integer primary key,
  id uuid not null default gen_random_uuid(),
  sender_n integer not null,
  receiver_n integer not null,
  title text not null,
  content text not null,
  is_anonymous boolean not null,
  age interval not null,
  tags text[] not null
) on commit drop;

insert into demo_kudos (n, sender_n, receiver_n, title, content, is_anonymous, age, tags) values
  (1, 1, 2, 'Người đồng đội tận tâm', '<p>Cảm ơn Bình đã hỗ trợ team trong đợt release vừa rồi!</p>', false, interval '13 days', '{teamwork,dedication}'),
  (2, 2, 3, 'Mentor tuyệt vời', '<p>Chị Châu luôn kiên nhẫn review code và chỉ bảo các bạn mới.</p>', false, interval '12 days', '{mentor}'),
  (3, 3, 1, 'Giải cứu deadline', '<p>An đã ở lại cùng team để fix bug production kịp thời.</p>', true, interval '11 days', '{dedication,customerfirst}'),
  (4, 4, 5, 'Ý tưởng sáng tạo', '<p>Ý tưởng tự động hoá báo cáo của Hà giúp cả phòng tiết kiệm hàng giờ mỗi tuần.</p>', false, interval '10 days', '{innovation}'),
  (5, 5, 4, 'Luôn lắng nghe khách hàng', '<p>Dũng xử lý phản hồi của khách hàng rất chu đáo.</p>', false, interval '9 days', '{customerfirst}'),
  (6, 6, 7, 'Root Further', '<p>Linh luôn tìm hiểu đến tận gốc vấn đề trước khi đưa ra giải pháp.</p>', false, interval '8 days', '{rootfurther,teamwork}'),
  (7, 7, 6, 'Tinh thần học hỏi', '<p>Khang tự học Go và chia sẻ lại cho cả team, quá đỉnh!</p>', true, interval '7 days', '{innovation,mentor}'),
  (8, 8, 1, 'Người truyền lửa', '<p>Anh An luôn truyền cảm hứng trong mỗi buổi sprint review.</p>', false, interval '6 days', '{teamwork}'),
  (9, 1, 8, 'Hỗ trợ nhiệt tình', '<p>Nam đã giúp mình setup môi trường chỉ trong một buổi sáng.</p>', false, interval '5 days', '{teamwork,mentor}'),
  (10, 2, 5, 'Chất lượng là ưu tiên', '<p>Hà viết test rất kỹ, release lần này không có bug nào.</p>', false, interval '4 days', '{dedication}'),
  (11, 3, 6, 'Đồng hành cùng dự án', '<p>Cảm ơn Khang đã gánh phần việc khó nhất của sprint.</p>', false, interval '3 days', '{rootfurther}'),
  (12, 4, 2, 'Giao tiếp rõ ràng', '<p>Bình viết tài liệu dễ hiểu, onboarding nhanh hơn hẳn.</p>', true, interval '2 days', '{customerfirst,teamwork}'),
  (13, 5, 3, 'Cảm ơn chị!', '<p>Chị Châu đã hỗ trợ em trong buổi demo với khách hàng.</p>', false, interval '1 day', '{mentor,customerfirst}'),
  (14, 6, 1, 'Thủ lĩnh thầm lặng', '<p>An luôn âm thầm dọn dẹp tech debt cho cả team.</p>', false, interval '3 hours', '{rootfurther,dedication}');

insert into public.kudos (id, sender_id, receiver_id, title, content, is_anonymous, created_at, updated_at)
select k.id, s.id, r.id, k.title, k.content, k.is_anonymous, now() - k.age, now() - k.age
from demo_kudos k
join demo_people s on s.n = k.sender_n
join demo_people r on r.n = k.receiver_n;

insert into public.hashtags (name)
select distinct unnest(tags) from demo_kudos
on conflict (name) do nothing;

insert into public.kudo_hashtags (kudo_id, hashtag_id)
select k.id, h.id
from demo_kudos k
cross join lateral unnest(k.tags) as t(name)
join public.hashtags h on h.name = t.name;

-- 5. Hearts (weight 1, no campaign): never by the kudo's sender (G06), one per Sunner per kudo.
insert into public.hearts (kudo_id, user_id, weight, created_at)
select k.id, p.id, 1, now() - k.age + interval '30 minutes'
from demo_kudos k
join demo_people p on p.n <> k.sender_n and (p.n + k.n) % 3 <> 0;

-- 6. Secret boxes: high-water mark floor(weighted hearts on a Sunner's sent kudos / 5) (BR-006).
insert into public.secret_boxes (user_id, seq, earned_at)
select totals.sender_id, s.seq, now() - make_interval(hours => s.seq * 7)
from (
  select k.sender_id, sum(h.weight) as hearts_received
  from public.kudos k
  join public.hearts h on h.kudo_id = k.id
  where k.sender_id in (select id from demo_people)
  group by k.sender_id
) totals
cross join lateral generate_series(1, (totals.hearts_received / 5)::integer) as s(seq);

-- Open each Sunner's first box with a deterministic icon; later boxes stay unopened.
update public.secret_boxes b
set opened_at = b.earned_at + interval '10 minutes',
    icon = (enum_range(null::public.secret_box_icon))[1 + (p.n % 6)]
from demo_people p
where b.user_id = p.id and b.seq = 1;
