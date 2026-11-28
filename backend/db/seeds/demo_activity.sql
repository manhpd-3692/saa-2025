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
  (8, 'd0000000-0000-4000-8000-000000000008', 'sunner08.demo@sun-asterisk.com', 'Bùi Thanh Nam', 'CECV5'),
  -- Names from the Live board design (Spotlight cloud, cards) so the board reads like Figma.
  (9, 'd0000000-0000-4000-8000-000000000009', 'sunner09.demo@sun-asterisk.com', 'Nguyễn Hoàng Linh', 'CECV2'),
  (10, 'd0000000-0000-4000-8000-000000000010', 'sunner10.demo@sun-asterisk.com', 'Huỳnh Dương Xuân Nhật', 'CECV3'),
  (11, 'd0000000-0000-4000-8000-000000000011', 'sunner11.demo@sun-asterisk.com', 'Nguyễn Văn Quy', 'CECV1'),
  (12, 'd0000000-0000-4000-8000-000000000012', 'sunner12.demo@sun-asterisk.com', 'Đỗ Hoàng Hiệp', 'CECV4'),
  (13, 'd0000000-0000-4000-8000-000000000013', 'sunner13.demo@sun-asterisk.com', 'Dương Thùy An', 'CECV5'),
  (14, 'd0000000-0000-4000-8000-000000000014', 'sunner14.demo@sun-asterisk.com', 'Mai Phương Thúy', 'CECV2'),
  (15, 'd0000000-0000-4000-8000-000000000015', 'sunner15.demo@sun-asterisk.com', 'Lê Kiều Trang', 'CECV3'),
  (16, 'd0000000-0000-4000-8000-000000000016', 'sunner16.demo@sun-asterisk.com', 'Nguyễn Bá Chức', 'CECV4');

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

-- 4. Kudos between demo Sunners (public, sanitized HTML), 30 minutes to 13 days old: enough for
-- three pages of the Live board feed. `likes` = hearts given (step 5), so the Highlight ranking
-- (weighted hearts, G12) has a clear top 5 and some kudos without any heart.
create temp table demo_kudos (
  n integer primary key,
  id uuid not null default gen_random_uuid(),
  sender_n integer not null,
  receiver_n integer not null,
  title text not null,
  content text not null,
  is_anonymous boolean not null,
  age interval not null,
  tags text[] not null,
  likes integer not null
) on commit drop;

insert into demo_kudos (n, sender_n, receiver_n, title, content, is_anonymous, age, tags, likes) values
  (1, 1, 2, 'Người đồng đội tận tâm', '<p>Cảm ơn Bình đã hỗ trợ team trong đợt release vừa rồi!</p>', false, interval '13 days', '{teamwork,dedication}', 6),
  (2, 2, 3, 'Mentor tuyệt vời', '<p>Chị Châu luôn kiên nhẫn review code và chỉ bảo các bạn mới.</p>', false, interval '12 days', '{mentor}', 3),
  (3, 3, 1, 'Giải cứu deadline', '<p>An đã ở lại cùng team để fix bug production kịp thời.</p>', true, interval '11 days', '{dedication,customerfirst}', 4),
  (4, 4, 5, 'Ý tưởng sáng tạo', '<p>Ý tưởng tự động hoá báo cáo của Hà giúp cả phòng tiết kiệm hàng giờ mỗi tuần.</p>', false, interval '10 days', '{innovation}', 9),
  (5, 5, 4, 'Luôn lắng nghe khách hàng', '<p>Dũng xử lý phản hồi của khách hàng rất chu đáo.</p>', false, interval '9 days', '{customerfirst}', 2),
  (6, 6, 7, 'Root Further', '<p>Linh luôn tìm hiểu đến tận gốc vấn đề trước khi đưa ra giải pháp.</p>', false, interval '8 days', '{rootfurther,teamwork}', 5),
  (7, 7, 6, 'Tinh thần học hỏi', '<p>Khang tự học Go và chia sẻ lại cho cả team, quá đỉnh!</p>', true, interval '7 days', '{innovation,mentor}', 7),
  (8, 8, 1, 'Người truyền lửa', '<p>Anh An luôn truyền cảm hứng trong mỗi buổi sprint review.</p>', false, interval '6 days', '{teamwork}', 1),
  (9, 1, 8, 'Hỗ trợ nhiệt tình', '<p>Nam đã giúp mình setup môi trường chỉ trong một buổi sáng.</p>', false, interval '5 days', '{teamwork,mentor}', 4),
  (10, 2, 5, 'Chất lượng là ưu tiên', '<p>Hà viết test rất kỹ, release lần này không có bug nào.</p>', false, interval '4 days', '{dedication}', 8),
  (11, 3, 6, 'Đồng hành cùng dự án', '<p>Cảm ơn Khang đã gánh phần việc khó nhất của sprint.</p>', false, interval '3 days', '{rootfurther}', 0),
  (12, 4, 2, 'Giao tiếp rõ ràng', '<p>Bình viết tài liệu dễ hiểu, onboarding nhanh hơn hẳn.</p>', true, interval '2 days', '{customerfirst,teamwork}', 3),
  (13, 5, 3, 'Cảm ơn chị!', '<p>Chị Châu đã hỗ trợ em trong buổi demo với khách hàng.</p>', false, interval '1 day', '{mentor,customerfirst}', 6),
  (14, 6, 1, 'Thủ lĩnh thầm lặng', '<p>An luôn âm thầm dọn dẹp tech debt cho cả team.</p>', false, interval '3 hours', '{rootfurther,dedication}', 2),
  (15, 9, 10, 'IDOL GIỚI TRẺ', '<p>Cảm ơn người em bình thường nhưng phi thường :D Cảm ơn sự chăm chỉ, cần mẫn của em đã tạo động lực rất nhiều cho team, để luôn nhắc mình luôn phải nỗ lực hơn nữa trong công việc. &lt;3</p>', false, interval '12 days 4 hours', '{dedication,inspiring}', 5),
  (16, 10, 9, 'Người hùng của lòng em', '<p>Linh luôn là người đầu tiên giơ tay nhận việc khó. Cảm ơn chị đã dẫn dắt dự án vượt qua giai đoạn nước rút!</p>', false, interval '11 days 6 hours', '{high-performing,inspiring}', 11),
  (17, 11, 12, 'Chiến binh on-call', '<p>Hiệp xử lý sự cố lúc 2 giờ sáng mà không một lời than phiền. Respect!</p>', false, interval '10 days 2 hours', '{dedication}', 2),
  (18, 12, 13, 'Người kể chuyện bằng dữ liệu', '<p>Báo cáo của An giúp khách hàng hiểu ngay vấn đề chỉ trong một trang.</p>', true, interval '9 days 5 hours', '{customerfirst,inspiring}', 4),
  (19, 13, 14, 'Bàn tay vàng UI', '<p>Thúy chăm chút từng pixel, màn hình mới đẹp hơn hẳn bản thiết kế.</p>', false, interval '8 days 3 hours', '{innovation}', 0),
  (20, 14, 15, 'Tinh thần Kaizen', '<p>Trang đề xuất cải tiến quy trình review giúp team giảm một nửa thời gian chờ.</p>', false, interval '7 days 1 hour', '{high-performing,rootfurther}', 7),
  (21, 15, 16, 'Người giữ lửa', '<p>Chức luôn tổ chức các buổi chia sẻ kiến thức mỗi thứ Sáu. Cảm ơn anh!</p>', false, interval '6 days 4 hours', '{mentor,teamwork}', 3),
  (22, 16, 9, 'Siêu sao giải quyết vấn đề', '<p>Bug khó đến mấy qua tay Linh cũng được xử lý gọn gàng. Team mình may mắn có chị!</p>', false, interval '5 days 2 hours', '{high-performing,dedication}', 10),
  (23, 9, 1, 'Cảm ơn anh An', '<p>Anh An đã review giúp em bản thiết kế hệ thống rất chi tiết.</p>', false, interval '4 days 6 hours', '{mentor}', 1),
  (24, 1, 11, 'Đồng đội số một', '<p>Quy luôn sẵn sàng hỗ trợ cả team, kể cả những việc ngoài phạm vi của mình.</p>', false, interval '3 days 5 hours', '{teamwork,inspiring}', 2),
  (25, 10, 3, 'Truyền cảm hứng mỗi ngày', '<p>Chị Châu là hình mẫu về sự kiên nhẫn và tận tâm với khách hàng.</p>', false, interval '2 days 8 hours', '{inspiring,customerfirst}', 0),
  (26, 11, 5, 'Người đi đầu đổi mới', '<p>Hà mạnh dạn thử công nghệ mới và chia sẻ kết quả với cả phòng.</p>', false, interval '1 day 6 hours', '{innovation,high-performing}', 6),
  (27, 12, 16, 'Người anh đáng tin cậy', '<p>Anh Chức luôn lắng nghe và đưa ra lời khuyên đúng lúc.</p>', false, interval '20 hours', '{mentor}', 1),
  (28, 13, 7, 'Chăm chỉ và bền bỉ', '<p>Linh hoàn thành khối lượng công việc khổng lồ trong tháng này.</p>', true, interval '9 hours', '{dedication}', 0),
  (29, 14, 2, 'Ấm áp như mùa xuân', '<p>Bình luôn hỏi han và giúp đỡ các bạn mới vào team.</p>', false, interval '2 hours', '{teamwork}', 3),
  (30, 15, 9, 'Cảm ơn vì luôn có mặt', '<p>Linh đã cùng mình chạy demo cho khách hàng ngay trong cuối tuần.</p>', false, interval '30 minutes', '{customerfirst,dedication}', 2);

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

-- 4b. Images (Codex R01, N02): attached uploads owned by the sender under opaque keys
-- `kudo-images/{uploadId}.png`, in sender order. cmd/seed stores the object at each key after
-- this file runs; the ids are fixed, so a reseed overwrites the same objects. Covered: two
-- five-image kudos (the Figma card), two anonymous kudos with images and one on the first feed page.
create temp table demo_images (
  kudo_n integer not null,
  position smallint not null,
  upload_id uuid not null
) on commit drop;

insert into demo_images (kudo_n, position, upload_id)
select kudo_n, pos - 1, ('d1000000-0000-4000-8000-' || lpad((row_number() over (order by kudo_n, pos))::text, 12, '0'))::uuid
from (values (15, 5), (16, 5), (18, 3), (28, 2), (30, 1)) as per_kudo(kudo_n, images)
cross join lateral generate_series(1, images) as pos;

insert into public.kudo_uploads (id, owner_id, object_path, mime, size_bytes, state, kudo_id, attached_at, created_at)
select i.upload_id, s.id, 'kudo-images/' || i.upload_id || '.png', 'image/png', 0, 'attached', k.id,
       now() - k.age, now() - k.age
from demo_images i
join demo_kudos k on k.n = i.kudo_n
join demo_people s on s.n = k.sender_n;

insert into public.kudo_images (kudo_id, upload_id, position)
select k.id, i.upload_id, i.position
from demo_images i
join demo_kudos k on k.n = i.kudo_n;

-- 5. Hearts (weight 1, no campaign): `likes` per kudo from a rotating set of demo Sunners, never
-- the kudo's sender (G06), one per Sunner per kudo.
insert into public.hearts (kudo_id, user_id, weight, created_at)
select k.id, voters.id, 1, now() - k.age + interval '10 minutes'
from demo_kudos k
cross join lateral (
  select p.id from demo_people p
  where p.n <> k.sender_n
  order by (p.n * 5 + k.n * 3) % 16, p.n
  limit k.likes
) voters;

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

-- Open each Sunner's first box with a deterministic icon, at staggered times so the Live board's
-- "10 Sunner nhận quà mới nhất" has a stable order; later boxes stay unopened.
update public.secret_boxes b
set opened_at = b.earned_at + make_interval(mins => 10 + p.n * 13),
    icon = (enum_range(null::public.secret_box_icon))[1 + (p.n % 6)]
from demo_people p
where b.user_id = p.id and b.seq = 1;
