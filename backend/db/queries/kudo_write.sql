-- Kudo writes (F005). Row locks use FOR NO KEY UPDATE: it serializes the same writers as
-- FOR UPDATE but does not block the KEY SHARE locks taken by foreign-key checks, which would
-- otherwise let two crossing transactions deadlock. Global order: kudo row, then users row (N05).
-- Also the compose reads and the edit (A3, A6, A7): an edit locks only the kudo row (the receiver
-- is immutable, N05) and holds it to commit; F009's kudo-linked insert waits on it with FOR SHARE
-- (N01), which conflicts with FOR NO KEY UPDATE.

-- name: LockReceiverForKudoCreate :one
-- F005 A5 (R10, N05): the only lock create takes on an existing row; also proves the receiver exists.
SELECT id
FROM users
WHERE id = $1
FOR NO KEY UPDATE;

-- name: CountDistinctPublicSenders :one
-- F005 ALG-003: distinct real senders over the receiver's public kudos (anonymous included).
SELECT count(DISTINCT sender_id)::int AS senders
FROM kudos
WHERE receiver_id = $1 AND status = 'public';

-- name: GetKudoSenderBrief :one
-- Sender fields for a named kudo's notification (never sent for an anonymous kudo, BR-005).
SELECT id, name, avatar_url
FROM users
WHERE id = $1;

-- name: InsertKudo :one
INSERT INTO kudos (sender_id, receiver_id, title, content, is_anonymous)
VALUES (@sender_id, @receiver_id, @title, @content, @is_anonymous)
RETURNING id;

-- name: UpsertHashtags :exec
-- BR-002: normalized names; a concurrent insert of the same new name is absorbed by the conflict clause.
INSERT INTO hashtags (name)
SELECT unnest(@names::text[])
ON CONFLICT (name) DO NOTHING;

-- name: LinkKudoHashtags :exec
INSERT INTO kudo_hashtags (kudo_id, hashtag_id)
SELECT @kudo_id::uuid, h.id
FROM hashtags h
WHERE h.name = ANY(@names::text[]);

-- name: InsertKudoImage :exec
INSERT INTO kudo_images (kudo_id, upload_id, position)
VALUES (@kudo_id, @upload_id, @position);

-- name: ListHashtags :many
-- F005 A3 (FR-002, BR-002): shared tags by name. @pattern is an escaped LIKE prefix of a
-- normalized name built in Go ('%' lists every tag).
SELECT id, name
FROM hashtags
WHERE name LIKE @pattern::text
ORDER BY name
LIMIT @row_limit::int;

-- name: GetKudoForEdit :one
-- F005 A6 prefill and the cheap pre-check of A7: author and status are compared in Go.
SELECT k.id, k.sender_id, k.status, k.title, k.content, k.is_anonymous,
       r.id AS receiver_id, r.name AS receiver_name, r.avatar_url AS receiver_avatar_url,
       ru.code AS receiver_unit_code
FROM kudos k
JOIN users r ON r.id = k.receiver_id
LEFT JOIN units ru ON ru.id = r.unit_id
WHERE k.id = $1;

-- name: ListKudoEditImages :many
-- F005 A6/A7 (N02): the current attachments, in order: kudo_images rows on attached uploads.
SELECT ki.upload_id, u.object_path
FROM kudo_images ki
JOIN kudo_uploads u ON u.id = ki.upload_id
WHERE ki.kudo_id = $1 AND u.state = 'attached'
ORDER BY ki.position;

-- name: LockKudoForEdit :one
-- F005 A7 (R02, N01, N05): the only row lock an edit takes; author and spam are re-checked under it.
SELECT id, sender_id, status, is_anonymous
FROM kudos
WHERE id = $1
FOR NO KEY UPDATE;

-- name: UpdateKudoContent :exec
UPDATE kudos
SET title = @title, content = @content, is_anonymous = @is_anonymous, updated_at = now()
WHERE id = @id;

-- name: UnlinkKudoHashtags :exec
DELETE FROM kudo_hashtags
WHERE kudo_id = $1;

-- name: DeleteKudoImages :exec
-- F005 A7: the edit rewrites the ordered attachment list after finalizing the uploads.
DELETE FROM kudo_images
WHERE kudo_id = $1;

-- name: RedactKudoNotificationSenders :execrows
-- F005 A7 (BR-008, R02, N01): a kudo turned anonymous loses the sender fields of every notice
-- linked to it, read or unread, in the edit transaction and under the kudo row lock.
UPDATE notifications
SET params = params - 'senderId' - 'senderName' - 'senderAvatarUrl'
WHERE kudo_id = $1
  AND jsonb_exists_any(params, ARRAY['senderId', 'senderName', 'senderAvatarUrl']);
