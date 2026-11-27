-- Kudo writes (F005). Row locks use FOR NO KEY UPDATE: it serializes the same writers as
-- FOR UPDATE but does not block the KEY SHARE locks taken by foreign-key checks, which would
-- otherwise let two crossing transactions deadlock. Global order: kudo row, then users row (N05).

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
