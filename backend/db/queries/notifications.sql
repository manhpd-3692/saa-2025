-- Notifications (F009). Only NotificationService.Create inserts or merges rows; no HTTP route
-- does (FR-602). Sunners read their own rows and change only read_at (A2, A4, A6, A7).

-- name: LockKudoAnonymity :one
-- N01: serializes a kudo-linked insert with an anonymity edit holding the kudo row for update.
SELECT is_anonymous
FROM kudos
WHERE id = $1
FOR SHARE;

-- name: InsertOnceNotification :one
-- N03: hero_level_up and icons_completed are stored at most once per recipient and key, read or not.
INSERT INTO notifications (recipient_id, kind, params, kudo_id, dedupe_key)
VALUES (@recipient_id, @kind, @params, @kudo_id, @dedupe_key)
ON CONFLICT (recipient_id, dedupe_key) WHERE kind IN ('hero_level_up', 'icons_completed')
DO NOTHING
RETURNING id;

-- name: UpsertNotification :one
-- BR-004: a repeat of the same event merges into the unread twin (params replaced, time bumped);
-- without a dedupe key, or once the twin is read, a new row is inserted.
INSERT INTO notifications (recipient_id, kind, params, kudo_id, dedupe_key)
VALUES (@recipient_id, @kind, @params, @kudo_id, @dedupe_key)
ON CONFLICT (recipient_id, dedupe_key)
  WHERE read_at IS NULL
    AND dedupe_key IS NOT NULL
    AND kind NOT IN ('hero_level_up', 'icons_completed')
DO UPDATE SET params = EXCLUDED.params, created_at = now()
RETURNING id;

-- name: ListNotificationsForRecipient :many
-- F009 A4 (FR-203, FR-403, BR-001): the caller's notices newest first, keyset on (created_at, id).
-- kudo_is_anonymous is the linked kudo's CURRENT flag for the read-time re-mask (BR-007, Codex R02);
-- kudo_viewable says whether the action button can still open that kudo (A5): it exists and is
-- public, the caller's own, or the caller is an admin (F006 BR-006). A removed kudo leaves kudo_id null.
SELECT n.id, n.kind, n.params, n.kudo_id, n.read_at, n.created_at,
       k.is_anonymous AS kudo_is_anonymous,
       (k.id IS NOT NULL
         AND (k.status = 'public' OR k.sender_id = @recipient_id::uuid OR @viewer_is_admin::boolean))::boolean
         AS kudo_viewable
FROM notifications n
LEFT JOIN kudos k ON k.id = n.kudo_id
WHERE n.recipient_id = @recipient_id::uuid
  AND (sqlc.narg(cursor_created_at)::timestamptz IS NULL
       OR (n.created_at, n.id) < (sqlc.narg(cursor_created_at)::timestamptz, sqlc.narg(cursor_id)::uuid))
ORDER BY n.created_at DESC, n.id DESC
LIMIT @row_limit::int;

-- name: CountUnreadNotifications :one
-- F009 A2 (FR-205): unread rows of the caller (partial index notifications_recipient_unread_idx).
SELECT count(*) AS unread_count
FROM notifications
WHERE recipient_id = $1
  AND read_at IS NULL;

-- name: MarkNotificationRead :execrows
-- F009 A6 (BR-001, BR-005): only the caller's own row; the first read time is kept. Zero rows
-- (missing id or someone else's) answers 404, so ids cannot be probed.
UPDATE notifications
SET read_at = coalesce(read_at, now())
WHERE id = @id
  AND recipient_id = @recipient_id;

-- name: MarkAllNotificationsRead :execrows
-- F009 A7 (FR-402, BR-005): every unread row of the caller; read rows keep their read_at.
UPDATE notifications
SET read_at = now()
WHERE recipient_id = $1
  AND read_at IS NULL;
