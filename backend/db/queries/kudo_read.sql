-- Kudo reads (F006). Every kudo-returning endpoint builds the one KudoCard DTO from these
-- rows and masks the sender in Go (maskSender), never in SQL. kudo_uploads.owner_id is never
-- selected here: it is the only link from an image to its uploader (Codex R01).

-- name: GetKudoForRead :one
-- F006 A7: the kudo with both people, their unit codes, the weighted heart total (G08) and
-- whether the viewer has hearted it.
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
JOIN kudo_heart_state hs ON hs.kudo_id = k.id
WHERE k.id = @id;

-- name: ListKudoHashtagNames :many
SELECT h.name
FROM kudo_hashtags kh
JOIN hashtags h ON h.id = kh.hashtag_id
WHERE kh.kudo_id = $1
ORDER BY h.name;

-- name: ListKudoImageObjectPaths :many
-- The current kudo_images rows are the only source of a kudo's images; only attached uploads
-- are signed (Codex N02).
SELECT u.object_path
FROM kudo_images ki
JOIN kudo_uploads u ON u.id = ki.upload_id
WHERE ki.kudo_id = $1 AND u.state = 'attached'
ORDER BY ki.position;
