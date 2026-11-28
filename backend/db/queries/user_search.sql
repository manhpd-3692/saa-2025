-- Sunner search (F005 A2): the recipient combobox and the @mention list share it (FR-201, FR-204).

-- name: SearchUsers :many
-- Case-insensitive match on name or email. @pattern is a LIKE pattern built in Go with `\`, `%`
-- and `_` escaped (default ESCAPE '\'). The caller is never offered (BR-001); plain ILIKE is enough
-- for the Sunner count (tech-spec 5.3 #2: revisit pg_trgm only if it gets slow).
SELECT u.id, u.name, u.avatar_url, un.code AS unit_code, un.name AS unit_name
FROM users u
LEFT JOIN units un ON un.id = u.unit_id
WHERE u.id <> @viewer_id::uuid
  AND (u.name ILIKE @pattern::text OR u.email ILIKE @pattern::text)
ORDER BY u.name, u.id
LIMIT @row_limit::int;
