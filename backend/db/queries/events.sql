-- name: GetCurrentEvent :one
-- F003 A3: the one current SAA event row (written by seed scripts only).
SELECT id, name, start_at, ceremony_at, venue, livestream_note
FROM events
ORDER BY created_at DESC, id DESC
LIMIT 1;
