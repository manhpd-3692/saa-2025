package dbx

import (
	"errors"

	"github.com/jackc/pgx/v5/pgconn"
)

// SQLSTATE codes of the constraint violations services turn into client answers.
const (
	UniqueViolation = "23505"
	CheckViolation  = "23514"
)

// IsConstraintViolation reports whether err (possibly wrapped) is a Postgres
// error with the given SQLSTATE raised by the named constraint.
func IsConstraintViolation(err error, code, constraint string) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == code && pgErr.ConstraintName == constraint
}
