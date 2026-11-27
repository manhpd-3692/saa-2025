-- name: InsertKudoUpload :exec
-- F005 A4: one `pending` upload with an opaque object key (Codex R01, N02).
INSERT INTO kudo_uploads (id, owner_id, object_path, mime, size_bytes)
VALUES (@id, @owner_id, @object_path, @mime, @size_bytes);

-- name: ListKudoUploadsByIDs :many
-- F005 A5 pre-check before the transaction: object keys plus the ownership and state to fail fast.
SELECT id, owner_id, object_path, state, kudo_id
FROM kudo_uploads
WHERE id = ANY(@ids::uuid[]);

-- name: LockKudoUploadsForUpdate :many
-- F005 A5: re-check ownership and state under row locks, in id order so concurrent creates never deadlock.
SELECT id, owner_id, state, kudo_id
FROM kudo_uploads
WHERE id = ANY(@ids::uuid[])
ORDER BY id
FOR UPDATE;

-- name: AttachKudoUpload :execrows
-- F005 A5 (BR-007): pending -> attached, set once, with the stored object's real type and size.
UPDATE kudo_uploads
SET state = 'attached', kudo_id = @kudo_id, attached_at = now(), mime = @mime, size_bytes = @size_bytes
WHERE id = @id AND owner_id = @owner_id AND state = 'pending' AND kudo_id IS NULL;

-- name: CountRecentPendingUploadsByOwner :one
-- Upload quota (reviewer W2): pending uploads the owner created in the last 24 h.
-- Older pending rows belong to the purge job (phase 06), not to the quota.
SELECT count(*)::int AS pending
FROM kudo_uploads
WHERE owner_id = @owner_id AND state = 'pending' AND created_at > now() - interval '24 hours';
