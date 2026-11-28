-- Demo notifications for LOCAL development (F009, phase 10): what the producers would have stored
-- for the demo activity. Run by `go run ./cmd/seed` right after demo_activity.sql, in the same
-- transaction, so its temp tables (demo_people, demo_kudos) still exist and its step 1 has already
-- removed the previous demo notifications and kudos.
--
-- Params follow each producer exactly: kudo_received {senderId, senderName, senderAvatarUrl}, none
-- for an anonymous kudo (BR-002, N01); heart_received {receiverName}, one notice per kudo (merged
-- while unread, dedupe heart:{kudoId}); secret_box_received {}; hero_level_up {levelKey,
-- fromLevelKey, sendersCount} once per tier ever (dedupe hero_level:{receiverId}:{tier}, N03, N04);
-- kudo_spam_warning {} for the kudo's author (dedupe kudo_spam:{kudoId}); icons_completed {} once
-- ever; generic {message} written by the team (D007). Notices older than two days are read; a
-- Secret Box notice is read once its box was opened. Every notice matches the data it reports.
-- Nguyễn Văn An (the e2e user) gets all seven kinds and more than one panel page (20).

-- 1. kudo_received: every demo kudo's receiver, one second after the kudo.
insert into public.notifications (recipient_id, kind, params, kudo_id, read_at, created_at)
select k.receiver_id, 'kudo_received',
       case when k.is_anonymous then '{}'::jsonb
            else jsonb_build_object('senderId', s.id, 'senderName', s.name, 'senderAvatarUrl', s.avatar_url) end,
       k.id,
       case when k.created_at < now() - interval '2 days' then k.created_at + interval '1 hour' end,
       k.created_at + interval '1 second'
from public.kudos k
join public.users s on s.id = k.sender_id
where k.id in (select id from demo_kudos);

-- 2. heart_received: the author of every hearted demo kudo, at its latest heart.
insert into public.notifications (recipient_id, kind, params, kudo_id, dedupe_key, read_at, created_at)
select k.sender_id, 'heart_received', jsonb_build_object('receiverName', r.name), k.id, 'heart:' || k.id,
       case when h.last_at < now() - interval '2 days' then h.last_at + interval '1 hour' end,
       h.last_at
from public.kudos k
join public.users r on r.id = k.receiver_id
join (select kudo_id, max(created_at) as last_at from public.hearts group by kudo_id) h on h.kudo_id = k.id
where k.id in (select id from demo_kudos);

-- 3. secret_box_received: one per granted box; read when the box was opened (from the notice),
-- still unread while the box waits unopened.
insert into public.notifications (recipient_id, kind, params, read_at, created_at)
select b.user_id, 'secret_box_received', '{}'::jsonb, b.opened_at, b.earned_at
from public.secret_boxes b
where b.user_id in (select id from demo_people);

-- 4. hero_level_up: the kudo that brought a receiver's distinct senders to 1, 5, 10 or 21
-- (New, Rising, Super, Legend, F008 BR-005) over public kudos, in time order.
with first_kudos as (
  select k.receiver_id, k.sender_id, min(k.created_at) as at
  from public.kudos k
  where k.id in (select id from demo_kudos) and k.status = 'public'
  group by k.receiver_id, k.sender_id
), counted as (
  select receiver_id, at, row_number() over (partition by receiver_id order by at, sender_id) as senders
  from first_kudos
), tiers (senders, tier, from_tier) as (
  values (1, 'New', null::text), (5, 'Rising', 'New'), (10, 'Super', 'Rising'), (21, 'Legend', 'Super')
)
insert into public.notifications (recipient_id, kind, params, dedupe_key, read_at, created_at)
select c.receiver_id, 'hero_level_up',
       jsonb_build_object('levelKey', t.tier, 'fromLevelKey', t.from_tier, 'sendersCount', c.senders),
       'hero_level:' || c.receiver_id || ':' || t.tier,
       case when c.at < now() - interval '2 days' then c.at + interval '1 hour' end,
       c.at + interval '1 second'
from counted c
join tiers t on t.senders = c.senders;

-- 5. One kudo of An moderated to Spam (F011) and its warning to him: he still opens it from the
-- notice (author view); it counts nowhere (F006/F007 read public kudos only).
insert into public.kudos (id, sender_id, receiver_id, title, content, is_anonymous, status,
                          moderation_version, moderated_at, created_at, updated_at)
select 'd2000000-0000-4000-8000-000000000001', s.id, r.id, 'Góp ý thẳng thắn',
       '<p>Lần sau nhớ làm cẩn thận hơn, đừng để cả team phải dọn hộ nữa.</p>', false, 'spam',
       1, now() - interval '1 day 2 hours', now() - interval '2 days 5 hours', now() - interval '2 days 5 hours'
from demo_people s, demo_people r
where s.n = 1 and r.n = 4;

-- 5b. More moderation history for Admin - Review content (F011), between Sunners no e2e spec
-- counts on: an anonymous punctuation-only kudo and an advert, both Spam (the Spam filter and the
-- real sender of an anonymous kudo), and a kudo once marked Spam by mistake and restored to
-- Public (version 2, its old warning read). Seeded decisions have no admin (moderated_by null):
-- admins exist only after a real sign-in (G02).
insert into public.kudos (id, sender_id, receiver_id, title, content, is_anonymous, status,
                          moderation_version, moderated_at, created_at, updated_at)
select v.id::uuid, s.id, r.id, v.title, v.content, v.anonymous, v.status::kudo_status,
       v.version, now() - v.moderated_ago, now() - v.age, now() - v.age
from (values
  ('d2000002-0000-4000-8000-000000000002', 20, 21, 'Cảm ơn', '<p>. . . . . . .</p>', true, 'spam', 1,
   interval '3 days', interval '3 days 4 hours'),
  ('d2000003-0000-4000-8000-000000000003', 22, 24, 'Ưu đãi chỉ hôm nay',
   '<p>Inbox mình để nhận khoá học làm giàu siêu tốc, số lượng có hạn!!!</p>', false, 'spam', 1,
   interval '20 hours', interval '1 day 1 hour'),
  ('d2000004-0000-4000-8000-000000000004', 19, 24, 'Cảm ơn bạn đã hỗ trợ',
   '<p>Cảm ơn bạn đã giúp mình chuẩn bị slide cho buổi thuyết trình với khách hàng.</p>', false, 'public', 2,
   interval '4 days', interval '5 days 3 hours')
) as v(id, sender_n, receiver_n, title, content, anonymous, status, version, moderated_ago, age)
join demo_people s on s.n = v.sender_n
join demo_people r on r.n = v.receiver_n;

insert into public.notifications (recipient_id, kind, params, kudo_id, dedupe_key, read_at, created_at)
select k.sender_id, 'kudo_spam_warning', '{}'::jsonb, k.id, 'kudo_spam:' || k.id,
       k.moderated_at + interval '2 hours', k.moderated_at
from public.kudos k
where k.id = 'd2000000-0000-4000-8000-000000000001';

-- The warnings of 5b: sent when each was marked Spam (the restored one a day before its
-- restore, which notifies nobody, D002); unread only when less than two days old.
insert into public.notifications (recipient_id, kind, params, kudo_id, dedupe_key, read_at, created_at)
select k.sender_id, 'kudo_spam_warning', '{}'::jsonb, k.id, 'kudo_spam:' || k.id,
       case when w.at > now() - interval '2 days' then null else w.at + interval '2 hours' end, w.at
from public.kudos k
cross join lateral (
  select case when k.status = 'public' then k.moderated_at - interval '1 day' else k.moderated_at end as at
) w
where k.id in ('d2000002-0000-4000-8000-000000000002', 'd2000003-0000-4000-8000-000000000003',
               'd2000004-0000-4000-8000-000000000004');

-- 6. icons_completed: every demo Sunner whose set is complete (users.icons_completed_at, set by
-- demo_activity.sql step 6 for An only), at that moment, once ever (dedupe icons_completed:{userId}).
insert into public.notifications (recipient_id, kind, params, dedupe_key, read_at, created_at)
select u.id, 'icons_completed', '{}'::jsonb, 'icons_completed:' || u.id,
       case when u.icons_completed_at < now() - interval '2 days' then u.icons_completed_at + interval '1 hour' end,
       u.icons_completed_at
from public.users u
where u.id in (select id from demo_people) and u.icons_completed_at is not null;

-- 7. generic: messages from the organisers to every demo Sunner (no target).
insert into public.notifications (recipient_id, kind, params, read_at, created_at)
select p.id, 'generic', jsonb_build_object('message', g.message),
       case when g.age > interval '2 days' then now() - g.age + interval '2 hours' end,
       now() - g.age
from demo_people p
cross join (values
  ('Chào mừng bạn đến với SAA 2025! Hãy gửi lời ghi nhận đầu tiên đến đồng đội của bạn nhé!', interval '13 days'),
  ('Lễ trao giải SAA 2025 sẽ diễn ra sau hai tuần nữa. Đừng quên lan tỏa thêm thật nhiều lời cảm ơn!', interval '5 days'),
  ('Ngày x2 tim đã bắt đầu! Mỗi lượt tim lời nhắn của bạn nhận được hôm nay đều được nhân đôi.', interval '1 day')
) as g(message, age);
