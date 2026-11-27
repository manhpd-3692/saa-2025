-- name: GetProfileAuth :one
-- A0 step 4: load the caller's profile id and stored role by the verified `sub`.
SELECT id, role
FROM users
WHERE id = $1;

-- name: UpsertProfileOnSignIn :exec
-- A9 (BR-001): insert on first sign-in; a later sign-in refreshes name, avatar and
-- last_login_at and only ever promotes the role (an ADMIN_EMAILS entry), never demotes.
-- The email is written on insert only.
INSERT INTO users (id, email, name, avatar_url, role, last_login_at)
VALUES (@id, @email, @name, @avatar_url, @role, now())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  avatar_url = EXCLUDED.avatar_url,
  last_login_at = now(),
  role = CASE WHEN EXCLUDED.role = 'admin' THEN 'admin'::user_role ELSE users.role END;

-- name: GetMe :one
-- A8: the caller's own row with its unit (Codex R15); role only from users.role (R05).
SELECT u.id, u.email, u.name, u.avatar_url, u.role,
       un.id AS unit_id, un.name AS unit_name, un.code AS unit_code
FROM users u
LEFT JOIN units un ON un.id = u.unit_id
WHERE u.id = $1;
