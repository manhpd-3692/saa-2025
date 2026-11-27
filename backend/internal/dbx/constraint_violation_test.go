package dbx

import (
	"errors"
	"fmt"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"
)

func TestIsConstraintViolation(t *testing.T) {
	emailTaken := fmt.Errorf("upsert profile: %w", &pgconn.PgError{Code: UniqueViolation, ConstraintName: "users_email_key"})
	cases := []struct {
		name       string
		err        error
		code, cons string
		want       bool
	}{
		{"wrapped match", emailTaken, UniqueViolation, "users_email_key", true},
		{"other constraint", emailTaken, UniqueViolation, "users_pkey", false},
		{"other code", emailTaken, CheckViolation, "users_email_key", false},
		{"not a Postgres error", errors.New("boom"), UniqueViolation, "users_email_key", false},
		{"nil", nil, UniqueViolation, "users_email_key", false},
	}
	for _, tc := range cases {
		if got := IsConstraintViolation(tc.err, tc.code, tc.cons); got != tc.want {
			t.Errorf("%s: got %v, want %v", tc.name, got, tc.want)
		}
	}
}
