-- name: GetProfileAuth :one
-- A0 step 4: load the caller's profile id and stored role by the verified `sub`.
SELECT id, role
FROM users
WHERE id = $1;
