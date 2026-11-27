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
