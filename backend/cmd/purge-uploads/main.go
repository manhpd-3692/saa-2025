// Command purge-uploads is the manual/admin purge of abandoned kudo images
// (F005 D017, Codex R04, N02; there is no scheduler): pending uploads older
// than 24 h and every leftover pending_delete upload lose their Storage object,
// then their kudo_uploads row. Attached uploads are never touched.
//
// It reads the API's environment (DATABASE_URL as saa_api, SUPABASE_URL,
// SUPABASE_SERVICE_KEY, ...): `set -a; . ./.env; set +a; go run ./cmd/purge-uploads`.
// `-dry-run` only counts the purgeable uploads and deletes nothing.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/manhpd-3692/saa-2025/backend/internal/config"
	"github.com/manhpd-3692/saa-2025/backend/internal/upload"
)

// purgeTimeout bounds one run; each row has its own 5 s transaction.
const purgeTimeout = 10 * time.Minute

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)
	if err := run(); err != nil {
		logger.Error("purge-uploads failed", "error", err)
		os.Exit(1)
	}
}

func run() error {
	dryRun := flag.Bool("dry-run", false, "count the purgeable uploads and delete nothing")
	flag.Parse()
	cfg, err := config.Load(os.Getenv)
	if err != nil {
		return err
	}
	if cfg.SupabaseServiceKey == "" {
		return errors.New("SUPABASE_SERVICE_KEY is required to delete Storage objects")
	}
	store, err := upload.NewStorageObjectStore(cfg.SupabaseURL, cfg.SupabaseServiceKey)
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), purgeTimeout)
	defer cancel()
	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("open database pool: %w", err)
	}
	defer pool.Close()

	result, err := upload.PurgeStaleUploads(ctx, pool, store, time.Now(), *dryRun)
	if err != nil {
		return err
	}
	slog.Info("purge-uploads done", "dry_run", *dryRun, "candidates", result.Candidates,
		"purged", result.Purged, "skipped", result.Skipped, "failed", result.Failed)
	if result.Failed > 0 {
		return fmt.Errorf("%d uploads could not be purged; they stay for the next run", result.Failed)
	}
	return nil
}
