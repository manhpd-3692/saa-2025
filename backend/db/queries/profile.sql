-- Sunner profiles (F007, ALG-001): the profile header, its counts and the received / sent kudo
-- lists. Every rule lives in these predicates: spam is never listed or counted (BR-003), and a
-- teammate's anonymous sent kudos are left out of the sent list and count unless the viewer is
-- the owner or an admin (BR-002, @include_anonymous_sent). The lists select exactly the
-- GetKudoForRead columns, so their cards are built and masked by the one kudo read code
-- (maskSender, X05). users.email is never selected here (FR-605).

-- name: GetProfileUser :one
-- Header identity: name, avatar and the unit code (units.code, Codex R15).
SELECT u.id, u.name, u.avatar_url, un.code AS unit_code
FROM users u
LEFT JOIN units un ON un.id = u.unit_id
WHERE u.id = @id;

-- name: ProfileUserExists :one
-- A3: the list answers 404 for an id that names no Sunner (FR-104); a primary-key probe only.
SELECT EXISTS (SELECT 1 FROM users WHERE id = @id)::boolean AS user_exists;

-- name: GetProfileKudoCounts :one
-- The three kudo figures with the same predicates as the lists (FR-403). Hearts received is the
-- weighted total (G08, X07) read per received kudo from kudo_heart_state; the OFFSET 0 fence
-- keeps the view from being aggregated over every kudo (as ListPublicKudoCards).
SELECT
  (SELECT count(*) FROM kudos k WHERE k.receiver_id = @owner_id::uuid AND k.status = 'public')::int AS kudos_received,
  (SELECT count(*) FROM kudos k WHERE k.sender_id = @owner_id::uuid AND k.status = 'public'
     AND (NOT k.is_anonymous OR @include_anonymous_sent::boolean))::int AS kudos_sent,
  (SELECT coalesce(sum(hs.heart_total), 0)
     FROM kudos k
     CROSS JOIN LATERAL (
       SELECT v.heart_total FROM kudo_heart_state v WHERE v.kudo_id = k.id OFFSET 0
     ) hs
     WHERE k.receiver_id = @owner_id::uuid AND k.status = 'public')::bigint AS hearts_received;

-- name: ListProfileKudosReceived :many
-- Received list, newest first, keyset on (created_at, id) (BR-005); index kudos_receiver_created_idx.
SELECT k.id, k.sender_id, k.receiver_id, k.title, k.content, k.is_anonymous, k.status, k.created_at,
       s.name AS sender_name, s.avatar_url AS sender_avatar_url, su.code AS sender_unit_code,
       r.name AS receiver_name, r.avatar_url AS receiver_avatar_url, ru.code AS receiver_unit_code,
       hs.heart_total,
       EXISTS (
         SELECT 1 FROM hearts h WHERE h.kudo_id = k.id AND h.user_id = @viewer_id::uuid
       ) AS viewer_hearted
FROM kudos k
JOIN users s ON s.id = k.sender_id
LEFT JOIN units su ON su.id = s.unit_id
JOIN users r ON r.id = k.receiver_id
LEFT JOIN units ru ON ru.id = r.unit_id
JOIN LATERAL (
  SELECT v.heart_total FROM kudo_heart_state v WHERE v.kudo_id = k.id OFFSET 0
) hs ON true
WHERE k.receiver_id = @owner_id::uuid
  AND k.status = 'public'
  AND (sqlc.narg(cursor_created_at)::timestamptz IS NULL
       OR (k.created_at, k.id) < (sqlc.narg(cursor_created_at)::timestamptz, sqlc.narg(cursor_id)::uuid))
ORDER BY k.created_at DESC, k.id DESC
LIMIT @row_limit::int;

-- name: ListProfileKudosSent :many
-- Sent list, newest first (BR-005); anonymous rows only with @include_anonymous_sent (BR-002);
-- index kudos_sender_created_idx.
SELECT k.id, k.sender_id, k.receiver_id, k.title, k.content, k.is_anonymous, k.status, k.created_at,
       s.name AS sender_name, s.avatar_url AS sender_avatar_url, su.code AS sender_unit_code,
       r.name AS receiver_name, r.avatar_url AS receiver_avatar_url, ru.code AS receiver_unit_code,
       hs.heart_total,
       EXISTS (
         SELECT 1 FROM hearts h WHERE h.kudo_id = k.id AND h.user_id = @viewer_id::uuid
       ) AS viewer_hearted
FROM kudos k
JOIN users s ON s.id = k.sender_id
LEFT JOIN units su ON su.id = s.unit_id
JOIN users r ON r.id = k.receiver_id
LEFT JOIN units ru ON ru.id = r.unit_id
JOIN LATERAL (
  SELECT v.heart_total FROM kudo_heart_state v WHERE v.kudo_id = k.id OFFSET 0
) hs ON true
WHERE k.sender_id = @owner_id::uuid
  AND k.status = 'public'
  AND (NOT k.is_anonymous OR @include_anonymous_sent::boolean)
  AND (sqlc.narg(cursor_created_at)::timestamptz IS NULL
       OR (k.created_at, k.id) < (sqlc.narg(cursor_created_at)::timestamptz, sqlc.narg(cursor_id)::uuid))
ORDER BY k.created_at DESC, k.id DESC
LIMIT @row_limit::int;
