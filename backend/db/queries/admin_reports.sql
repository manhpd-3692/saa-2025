-- Admin Overview and user directory reads (F010 INT-001). Read-only; every query runs behind
-- RequireAdmin (BR-007). Activity windows are half-open [window_start, window_end) computed in Go
-- from whole days in the report time zone (BR-001). Overview never counts spam (BR-002); the
-- directory counts public kudos only, like the profile figures (F007), anonymous ones included:
-- an admin sees per-person totals (technical-spec § 4.2).

-- name: AdminOverviewByUnit :many
-- ALG-001 per unit: every unit, zeros without activity (FR-101), ordered by name. Total member is
-- today's headcount (no window); "with kudo" = sent or received a counted kudo in the window.
WITH counted AS (
  SELECT k.sender_id, k.receiver_id
  FROM kudos k
  WHERE k.status <> 'spam'
    AND k.created_at >= @window_start::timestamptz AND k.created_at < @window_end::timestamptz
),
per_user AS (
  SELECT u.id, u.unit_id,
         coalesce(s.n, 0) AS sent, coalesce(r.n, 0) AS received, coalesce(b.n, 0) AS boxes,
         (s.n IS NOT NULL OR r.n IS NOT NULL) AS with_kudo
  FROM users u
  LEFT JOIN (SELECT sender_id AS user_id, count(*) AS n FROM counted GROUP BY sender_id) s ON s.user_id = u.id
  LEFT JOIN (SELECT receiver_id AS user_id, count(*) AS n FROM counted GROUP BY receiver_id) r ON r.user_id = u.id
  LEFT JOIN (
    SELECT sb.user_id, count(*) AS n
    FROM secret_boxes sb
    WHERE sb.earned_at >= @window_start::timestamptz AND sb.earned_at < @window_end::timestamptz
    GROUP BY sb.user_id
  ) b ON b.user_id = u.id
)
SELECT un.id AS unit_id, un.code AS unit_code, un.name AS unit_name,
       count(p.id)::int AS total_members,
       coalesce(sum(p.sent), 0)::int AS kudos_sent,
       coalesce(sum(p.received), 0)::int AS kudos_received,
       (count(p.id) FILTER (WHERE p.with_kudo))::int AS users_with_kudo,
       coalesce(sum(p.boxes), 0)::int AS secret_boxes
FROM units un
LEFT JOIN per_user p ON p.unit_id = un.id
GROUP BY un.id
ORDER BY un.name, un.id;

-- name: AdminOverviewAll :one
-- ALG-001 All row (BR-003): the same per-user measures over every user, units or not, so each
-- person counts once and the row is not the sum of the unit rows.
WITH counted AS (
  SELECT k.sender_id, k.receiver_id
  FROM kudos k
  WHERE k.status <> 'spam'
    AND k.created_at >= @window_start::timestamptz AND k.created_at < @window_end::timestamptz
),
per_user AS (
  SELECT u.id,
         coalesce(s.n, 0) AS sent, coalesce(r.n, 0) AS received, coalesce(b.n, 0) AS boxes,
         (s.n IS NOT NULL OR r.n IS NOT NULL) AS with_kudo
  FROM users u
  LEFT JOIN (SELECT sender_id AS user_id, count(*) AS n FROM counted GROUP BY sender_id) s ON s.user_id = u.id
  LEFT JOIN (SELECT receiver_id AS user_id, count(*) AS n FROM counted GROUP BY receiver_id) r ON r.user_id = u.id
  LEFT JOIN (
    SELECT sb.user_id, count(*) AS n
    FROM secret_boxes sb
    WHERE sb.earned_at >= @window_start::timestamptz AND sb.earned_at < @window_end::timestamptz
    GROUP BY sb.user_id
  ) b ON b.user_id = u.id
)
SELECT count(*)::int AS total_members,
       coalesce(sum(p.sent), 0)::int AS kudos_sent,
       coalesce(sum(p.received), 0)::int AS kudos_received,
       (count(*) FILTER (WHERE p.with_kudo))::int AS users_with_kudo,
       coalesce(sum(p.boxes), 0)::int AS secret_boxes
FROM per_user p;

-- name: AdminCountUsers :one
-- A4 total for the pager: the same filters as AdminListUsers (BR-005). @pattern is a LIKE pattern
-- built in Go with `\`, `%` and `_` escaped; the Level filter is the F008 tier's sender range.
SELECT count(*)::int AS total
FROM users u
WHERE (sqlc.narg(unit_id)::uuid IS NULL OR u.unit_id = sqlc.narg(unit_id)::uuid)
  AND (sqlc.narg(role)::user_role IS NULL OR u.role = sqlc.narg(role)::user_role)
  AND (sqlc.narg(pattern)::text IS NULL
       OR u.name ILIKE sqlc.narg(pattern)::text OR u.email ILIKE sqlc.narg(pattern)::text)
  AND (sqlc.narg(min_senders)::int IS NULL OR (
    SELECT count(DISTINCT k.sender_id) FROM kudos k WHERE k.receiver_id = u.id AND k.status = 'public'
  ) BETWEEN sqlc.narg(min_senders)::int AND sqlc.narg(max_senders)::int);

-- name: AdminListUsers :many
-- A4/A5/A6 rows ordered by name (D013). Paging: @row_offset for the table, the (name, id) keyset
-- for the streamed export. senders feeds F008's tier (HeroTierFor); total_heart is the weighted
-- kudo_heart_state total over public kudos received (BR-008, X07; the OFFSET 0 fence as in
-- GetProfileKudoCounts); badges and six_badges_seconds follow ALG-003 (distinct opened icons;
-- time from the first opened box to the first open of the sixth icon, -1 below six).
SELECT u.id, u.name, u.email, u.avatar_url, u.role, u.last_login_at, un.code AS unit_code,
       st.kudos_sent, rc.kudos_received, rc.senders, ht.total_heart, bd.badges, bd.six_badges_seconds
FROM users u
LEFT JOIN units un ON un.id = u.unit_id
CROSS JOIN LATERAL (
  SELECT count(*)::int AS kudos_sent FROM kudos k WHERE k.sender_id = u.id AND k.status = 'public'
) st
CROSS JOIN LATERAL (
  SELECT count(*)::int AS kudos_received, count(DISTINCT k.sender_id)::int AS senders
  FROM kudos k WHERE k.receiver_id = u.id AND k.status = 'public'
) rc
CROSS JOIN LATERAL (
  SELECT coalesce(sum(hs.heart_total), 0)::bigint AS total_heart
  FROM kudos k
  CROSS JOIN LATERAL (
    SELECT v.heart_total FROM kudo_heart_state v WHERE v.kudo_id = k.id OFFSET 0
  ) hs
  WHERE k.receiver_id = u.id AND k.status = 'public'
) ht
CROSS JOIN LATERAL (
  SELECT count(*)::int AS badges,
         (CASE WHEN count(*) = 6
               THEN floor(extract(epoch FROM max(fi.first_at) - min(fi.first_at)))
               ELSE -1 END)::bigint AS six_badges_seconds
  FROM (
    SELECT min(sb.opened_at) AS first_at
    FROM secret_boxes sb
    WHERE sb.user_id = u.id AND sb.opened_at IS NOT NULL
    GROUP BY sb.icon
  ) fi
) bd
WHERE (sqlc.narg(unit_id)::uuid IS NULL OR u.unit_id = sqlc.narg(unit_id)::uuid)
  AND (sqlc.narg(role)::user_role IS NULL OR u.role = sqlc.narg(role)::user_role)
  AND (sqlc.narg(pattern)::text IS NULL
       OR u.name ILIKE sqlc.narg(pattern)::text OR u.email ILIKE sqlc.narg(pattern)::text)
  AND (sqlc.narg(min_senders)::int IS NULL
       OR rc.senders BETWEEN sqlc.narg(min_senders)::int AND sqlc.narg(max_senders)::int)
  AND (sqlc.narg(after_name)::text IS NULL
       OR (u.name, u.id) > (sqlc.narg(after_name)::text, sqlc.narg(after_id)::uuid))
ORDER BY u.name, u.id
LIMIT @row_limit::int OFFSET @row_offset::int;

-- name: AdminListUnits :many
-- The Unit filter choices (E02): every unit, by name.
SELECT id, code, name
FROM units
ORDER BY name, id;
