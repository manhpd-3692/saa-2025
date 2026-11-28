-- Avatar hover card (F006 A9): name, unit and public kudo counts of one Sunner.

-- name: GetUserHoverCard :one
-- The sent count skips the user's anonymous kudos unless @include_anonymous (the viewer is an
-- admin or the user themself), so a hover card never helps deduce an anonymous sender (BR-002).
SELECT u.id, u.name, u.avatar_url, un.code AS unit_code, un.name AS unit_name,
       (SELECT count(*) FROM kudos k WHERE k.receiver_id = u.id AND k.status = 'public')::int AS received_count,
       (SELECT count(*) FROM kudos k WHERE k.sender_id = u.id AND k.status = 'public'
          AND (NOT k.is_anonymous OR @include_anonymous::boolean))::int AS sent_count
FROM users u
LEFT JOIN units un ON un.id = u.unit_id
WHERE u.id = @id;
