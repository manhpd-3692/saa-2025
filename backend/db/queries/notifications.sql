-- Notifications (F009 A1). Only NotificationService.Create writes rows; no HTTP route does.

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
