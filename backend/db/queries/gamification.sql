-- Hearts, hero tiers and secret boxes (F008). Row locks use FOR NO KEY UPDATE (see
-- kudo_write.sql): two Sunners hearting each other's kudos at once must not deadlock on the
-- KEY SHARE locks their heart inserts take on users rows.

-- name: CountDistinctSendersByReceivers :many
-- F008 A4 (ALG-001): distinct senders over public kudos received, anonymous included.
SELECT receiver_id, count(DISTINCT sender_id)::int AS senders
FROM kudos
WHERE receiver_id = ANY(@receiver_ids::uuid[]) AND status = 'public'
GROUP BY receiver_id;

-- name: GetKudoForHeartForUpdate :one
-- F008 A1: lock the kudo for the heart change; the receiver's name feeds heart_received.
SELECT k.id, k.sender_id, k.status, r.name AS receiver_name
FROM kudos k
JOIN users r ON r.id = k.receiver_id
WHERE k.id = $1
FOR NO KEY UPDATE OF k;

-- name: GetActiveCampaignWithMaxMultiplier :one
-- F008 INT-001 (BR-004): the highest multiplier among campaigns active at transaction time. The
-- heart transaction (A1) stores its weight; the badge read (A3) shows the same row.
SELECT id, name, multiplier, starts_at, ends_at
FROM campaigns
WHERE starts_at <= now() AND now() < ends_at
ORDER BY multiplier DESC, starts_at DESC, id
LIMIT 1;

-- name: InsertHeart :execrows
-- BR-001: one heart per Sunner per kudo; a second PUT changes nothing.
INSERT INTO hearts (kudo_id, user_id, weight, campaign_id)
VALUES (@kudo_id, @user_id, @weight, @campaign_id)
ON CONFLICT (kudo_id, user_id) DO NOTHING;

-- name: DeleteHeart :execrows
DELETE FROM hearts
WHERE kudo_id = $1 AND user_id = $2;

-- name: GetKudoHeartStateForViewer :one
SELECT hs.heart_total,
       EXISTS (
         SELECT 1 FROM hearts h WHERE h.kudo_id = hs.kudo_id AND h.user_id = @viewer_id::uuid
       ) AS viewer_hearted
FROM kudo_heart_state hs
WHERE hs.kudo_id = @kudo_id;

-- name: LockUserForBoxTopUp :one
-- ALG-002: serializes every box top-up of one sender.
SELECT id
FROM users
WHERE id = $1
FOR NO KEY UPDATE;

-- name: SumHeartsOnSentKudos :one
-- ALG-002: weighted hearts received on all kudos the Sunner sent.
SELECT coalesce(sum(h.weight), 0)::bigint AS total
FROM hearts h
JOIN kudos k ON k.id = h.kudo_id
WHERE k.sender_id = $1;

-- name: MaxSecretBoxSeq :one
SELECT coalesce(max(seq), 0)::int AS max_seq
FROM secret_boxes
WHERE user_id = $1;

-- name: InsertSecretBoxes :execrows
-- BR-006: only sequence numbers above the high-water mark; the unique (user_id, seq) is a second guard.
INSERT INTO secret_boxes (user_id, seq)
SELECT @user_id::uuid, s
FROM generate_series(@from_seq::int, @to_seq::int) AS s
ON CONFLICT (user_id, seq) DO NOTHING;

-- name: LockUserForSecretBoxOpen :one
-- ALG-004 (R11): every open of one Sunner runs one at a time.
SELECT id
FROM users
WHERE id = $1
FOR NO KEY UPDATE;

-- name: GetSecretBoxOpenResult :one
-- ALG-004 (R12, N12): the stored response of an open already made with this Idempotency-Key.
SELECT open_result
FROM secret_boxes
WHERE user_id = @user_id AND open_request_id = @open_request_id;

-- name: ListCollectedIcons :many
SELECT DISTINCT icon
FROM secret_boxes
WHERE user_id = $1 AND icon IS NOT NULL
ORDER BY icon;

-- name: CountSecretBoxes :one
SELECT count(*) FILTER (WHERE opened_at IS NULL)::int AS unopened,
       count(*) FILTER (WHERE opened_at IS NOT NULL)::int AS opened
FROM secret_boxes
WHERE user_id = $1;

-- name: LockOldestUnopenedSecretBox :one
SELECT id
FROM secret_boxes
WHERE user_id = $1 AND opened_at IS NULL
ORDER BY seq
LIMIT 1
FOR UPDATE;

-- name: SetIconsCompletedAt :execrows
-- BR-010: set once, by the open that first reaches all six icons.
UPDATE users
SET icons_completed_at = now()
WHERE id = $1 AND icons_completed_at IS NULL;

-- name: MarkSecretBoxOpened :one
-- N12: the stored open_result is returned as-is, so the first answer and every replay are identical.
UPDATE secret_boxes
SET opened_at = now(), icon = @icon, open_request_id = @open_request_id, open_result = @open_result
WHERE id = @id
RETURNING open_result;

-- name: GetIconsCompleted :one
-- F008 A5 (R11): whether the Sunner's icon set was completed (set once by the completing open).
SELECT (icons_completed_at IS NOT NULL)::boolean AS completed
FROM users
WHERE id = $1;

-- name: ListLatestGiftRecipients :many
-- F008 A7 (FR-407, F006 FR-210 D006): the Sunners who most recently opened a secret box
-- ("gift" = opened box), newest first, with the icon of that latest box.
SELECT u.id, u.name, u.avatar_url, latest.icon, latest.opened_at
FROM (
  SELECT DISTINCT ON (b.user_id) b.user_id, b.icon, b.opened_at
  FROM secret_boxes b
  WHERE b.opened_at IS NOT NULL
  ORDER BY b.user_id, b.opened_at DESC, b.id DESC
) latest
JOIN users u ON u.id = latest.user_id
ORDER BY latest.opened_at DESC, u.id
LIMIT @row_limit::int;
