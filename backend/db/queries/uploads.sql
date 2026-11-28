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
-- Older pending rows belong to the manual purge (cmd/purge-uploads), not to the quota.
SELECT count(*)::int AS pending
FROM kudo_uploads
WHERE owner_id = @owner_id AND state = 'pending' AND created_at > now() - interval '24 hours';

-- name: LockKudoUploadForDelete :one
-- F005 A8 (R04, N02): the upload row, locked; owner and state decide 404 / 409 / 204 in Go.
SELECT id, owner_id, object_path, state
FROM kudo_uploads
WHERE id = $1
FOR UPDATE;

-- name: MarkUnsavedUploadPendingDelete :execrows
-- F005 A8 and the manual purge (R04, N02): claims a pending (never attached) upload under its row
-- lock. After commit the object, then the row, are deleted; a failed object delete leaves the row
-- pending_delete for the purge, so no object is ever left without a row.
UPDATE kudo_uploads
SET state = 'pending_delete'
WHERE id = $1 AND state = 'pending';

-- name: MarkKudoUploadsPendingDelete :many
-- F005 A7 (N02): attachments removed in an edit become pending_delete in the edit transaction.
-- pending_delete is terminal: never attached, kept or deleted through the API again.
UPDATE kudo_uploads
SET state = 'pending_delete'
WHERE id = ANY(@ids::uuid[]) AND kudo_id = @kudo_id AND state = 'attached'
RETURNING id, object_path;

-- name: DeletePendingDeleteUpload :execrows
-- After commit, once the object is gone (edit cleanup, A8 DELETE, purge; R04, N02): only pending_delete rows.
DELETE FROM kudo_uploads
WHERE id = $1 AND state = 'pending_delete';

-- name: ListPurgeableUploads :many
-- Manual purge (R04, N02): pending uploads created before @created_before (24 h ago) and every
-- leftover pending_delete upload. Attached uploads are never listed.
SELECT id
FROM kudo_uploads
WHERE (state = 'pending' AND created_at < @created_before) OR state = 'pending_delete'
ORDER BY created_at, id;

-- name: LockPurgeableUpload :one
-- Manual purge: re-checks the row under its lock (an attach may have won); SKIP LOCKED leaves rows
-- a live request is working on.
SELECT id, object_path, state
FROM kudo_uploads
WHERE id = @id AND ((state = 'pending' AND created_at < @created_before) OR state = 'pending_delete')
FOR UPDATE SKIP LOCKED;

