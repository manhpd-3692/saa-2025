-- Admin moderation decisions (F011 ALG-001). Lock order: kudo row, then receiver users row (N05).
-- FOR NO KEY UPDATE as in kudo_write.sql.

-- name: LockKudoForModeration :one
SELECT id, sender_id, receiver_id, status, moderation_version, moderated_by, moderated_at
FROM kudos
WHERE id = $1
FOR NO KEY UPDATE;

-- name: LockKudoReceiverForModeration :one
SELECT id
FROM users
WHERE id = $1
FOR NO KEY UPDATE;

-- name: SetKudoStatus :one
-- R13: versioned compare-and-set; no row when the version moved or the status already matches.
UPDATE kudos
SET status = @status,
    moderation_version = moderation_version + 1,
    moderated_by = @moderated_by,
    moderated_at = now()
WHERE id = @id AND moderation_version = @expected_version AND status <> @status
RETURNING sender_id, status, moderation_version, moderated_by, moderated_at;

-- Admin review list (F011 ALG-002, BR-001, BR-005). Every filter is optional and they combine with
-- AND; the window is the half-open [start of `from`, start of the day after `to`) in the report
-- time zone, built in Go. @pattern is a LIKE pattern built in Go with `\`, `%` and `_` escaped; it
-- matches the title or the body's visible text: the stored HTML with block tags (p, li, ol,
-- blockquote, br) turned into spaces, other tags dropped, bluemonday's entities decoded (&amp;
-- last) and whitespace runs collapsed, so a tag or attribute name never matches. The same
-- expression is in both queries so the pager counts exactly the listed set.

-- name: AdminCountKudos :one
SELECT count(*)::int AS total
FROM kudos k
WHERE (sqlc.narg(sender_id)::uuid IS NULL OR k.sender_id = sqlc.narg(sender_id)::uuid)
  AND (sqlc.narg(receiver_id)::uuid IS NULL OR k.receiver_id = sqlc.narg(receiver_id)::uuid)
  AND (sqlc.narg(status)::kudo_status IS NULL OR k.status = sqlc.narg(status)::kudo_status)
  AND (sqlc.narg(window_start)::timestamptz IS NULL
       OR (k.created_at >= sqlc.narg(window_start)::timestamptz AND k.created_at < sqlc.narg(window_end)::timestamptz))
  AND (sqlc.narg(pattern)::text IS NULL
       OR k.title ILIKE sqlc.narg(pattern)::text
       OR regexp_replace(replace(replace(replace(replace(replace(
            regexp_replace(regexp_replace(k.content, '<(br|/?(p|li|ol|blockquote))([\s/][^>]*)?>', ' ', 'gi'), '<[^>]*>', '', 'g'),
            '&lt;', '<'), '&gt;', '>'), '&#34;', '"'), '&#39;', ''''), '&amp;', '&'), '\s+', ' ', 'g')
          ILIKE sqlc.narg(pattern)::text);

-- name: AdminListKudos :many
-- One page newest first (created_at desc, id desc), every status. The sender is the REAL sender,
-- also of anonymous kudos: only the ADMIN-class review endpoint reads this, and the Go read layer
-- applies the shared anonymity rule (BR-004, G04). Hashtags by name; the weighted heart total
-- behind the OFFSET 0 fence as in ListPublicKudoCards.
SELECT k.id, k.title, k.content, k.is_anonymous, k.status, k.moderation_version, k.moderated_by,
       k.moderated_at, k.created_at,
       k.sender_id, s.name AS sender_name, s.avatar_url AS sender_avatar_url, su.code AS sender_unit_code,
       k.receiver_id, r.name AS receiver_name, r.avatar_url AS receiver_avatar_url, ru.code AS receiver_unit_code,
       hs.heart_total,
       ARRAY(
         SELECT h.name FROM kudo_hashtags kh JOIN hashtags h ON h.id = kh.hashtag_id
         WHERE kh.kudo_id = k.id ORDER BY h.name
       )::text[] AS hashtags
FROM kudos k
JOIN users s ON s.id = k.sender_id
LEFT JOIN units su ON su.id = s.unit_id
JOIN users r ON r.id = k.receiver_id
LEFT JOIN units ru ON ru.id = r.unit_id
JOIN LATERAL (
  SELECT v.heart_total FROM kudo_heart_state v WHERE v.kudo_id = k.id OFFSET 0
) hs ON true
WHERE (sqlc.narg(sender_id)::uuid IS NULL OR k.sender_id = sqlc.narg(sender_id)::uuid)
  AND (sqlc.narg(receiver_id)::uuid IS NULL OR k.receiver_id = sqlc.narg(receiver_id)::uuid)
  AND (sqlc.narg(status)::kudo_status IS NULL OR k.status = sqlc.narg(status)::kudo_status)
  AND (sqlc.narg(window_start)::timestamptz IS NULL
       OR (k.created_at >= sqlc.narg(window_start)::timestamptz AND k.created_at < sqlc.narg(window_end)::timestamptz))
  AND (sqlc.narg(pattern)::text IS NULL
       OR k.title ILIKE sqlc.narg(pattern)::text
       OR regexp_replace(replace(replace(replace(replace(replace(
            regexp_replace(regexp_replace(k.content, '<(br|/?(p|li|ol|blockquote))([\s/][^>]*)?>', ' ', 'gi'), '<[^>]*>', '', 'g'),
            '&lt;', '<'), '&gt;', '>'), '&#34;', '"'), '&#39;', ''''), '&amp;', '&'), '\s+', ' ', 'g')
          ILIKE sqlc.narg(pattern)::text)
ORDER BY k.created_at DESC, k.id DESC
LIMIT @row_limit::int OFFSET @row_offset::int;

-- name: AdminListKudoPeople :many
-- F011 A2 (BR-009): people who sent (@as_sender) or received at least one kudo of any status,
-- narrowed by a case-insensitive "contains" on name or email, by name. No email is selected.
SELECT u.id, u.name, u.avatar_url, un.code AS unit_code
FROM users u
LEFT JOIN units un ON un.id = u.unit_id
WHERE (CASE WHEN @as_sender::boolean
            THEN EXISTS (SELECT 1 FROM kudos k WHERE k.sender_id = u.id)
            ELSE EXISTS (SELECT 1 FROM kudos k WHERE k.receiver_id = u.id) END)
  AND (sqlc.narg(pattern)::text IS NULL
       OR u.name ILIKE sqlc.narg(pattern)::text OR u.email ILIKE sqlc.narg(pattern)::text)
ORDER BY u.name, u.id
LIMIT @row_limit::int;

-- name: AdminKudoPeopleByIDs :many
-- The people an applied Sender / Receiver filter names, so the page can label the chosen option.
SELECT u.id, u.name, u.avatar_url, un.code AS unit_code
FROM users u
LEFT JOIN units un ON un.id = u.unit_id
WHERE u.id = ANY(@ids::uuid[]);
