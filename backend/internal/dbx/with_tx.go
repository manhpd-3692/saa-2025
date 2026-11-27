// Package dbx holds the database deadlines and the transaction helper every Go
// service uses (Codex R23).
package dbx

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

// Per-request database deadlines (Codex R23).
const (
	// RequestTimeout bounds the database work of one API request.
	RequestTimeout = 5 * time.Second
	// ExportTimeout bounds a streamed CSV export (F010).
	ExportTimeout = 20 * time.Second
	// rollbackTimeout bounds the rollback issued after fn fails or the
	// request deadline expired.
	rollbackTimeout = 2 * time.Second
)

// TxBeginner starts a transaction; *pgxpool.Pool and *pgx.Conn satisfy it.
type TxBeginner interface {
	BeginTx(ctx context.Context, opts pgx.TxOptions) (pgx.Tx, error)
}

// RequestContext derives the 5 s per-request database context.
func RequestContext(ctx context.Context) (context.Context, context.CancelFunc) {
	return context.WithTimeout(ctx, RequestTimeout)
}

// WithTx runs fn in one transaction under the 5 s request deadline. fn must use
// the ctx it receives for every query so the deadline bounds the whole unit.
func WithTx(ctx context.Context, db TxBeginner, fn func(ctx context.Context, tx pgx.Tx) error) error {
	return WithTxTimeout(ctx, db, RequestTimeout, fn)
}

// WithTxTimeout runs fn in one transaction bounded by timeout: commit when fn
// returns nil, otherwise (or on panic) roll back. The rollback runs on a fresh
// short context so it still reaches the server after the deadline expired.
func WithTxTimeout(ctx context.Context, db TxBeginner, timeout time.Duration,
	fn func(ctx context.Context, tx pgx.Tx) error) (err error) {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	tx, err := db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	committed := false
	defer func() {
		if committed {
			return
		}
		rbCtx, rbCancel := context.WithTimeout(context.WithoutCancel(ctx), rollbackTimeout)
		defer rbCancel()
		if rbErr := tx.Rollback(rbCtx); rbErr != nil && !errors.Is(rbErr, pgx.ErrTxClosed) {
			err = errors.Join(err, fmt.Errorf("rollback transaction: %w", rbErr))
		}
	}()

	if err := fn(ctx, tx); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}
	committed = true
	return nil
}
