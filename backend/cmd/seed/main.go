// Command seed loads a deterministic local fixture (Codex R16): the event row
// for SEED_SCENARIO (prelaunch | live (default) | after-ceremony) plus demo
// activity dated within the last 14 days. Units come from supabase/seed.sql.
//
// It connects with LOCAL_OWNER_DATABASE_URL (the local `postgres` owner role,
// needed to write auth.users) and refuses any non-loopback host.
package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/manhpd-3692/saa-2025/backend/db/seeds"
	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
)

const (
	envOwnerDatabaseURL = "LOCAL_OWNER_DATABASE_URL"
	envSeedScenario     = "SEED_SCENARIO"
	seedTimeout         = time.Minute
)

func main() {
	if err := run(); err != nil {
		slog.Error("seed failed", "error", err)
		os.Exit(1)
	}
}

func run() error {
	scenario, file, err := resolveScenario(os.Getenv(envSeedScenario))
	if err != nil {
		return err
	}
	cfg, err := localOwnerConfig(os.Getenv(envOwnerDatabaseURL))
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), seedTimeout)
	defer cancel()

	conn, err := pgx.ConnectConfig(ctx, cfg)
	if err != nil {
		return fmt.Errorf("connect: %w", err)
	}
	defer conn.Close(context.WithoutCancel(ctx))

	err = pgx.BeginFunc(ctx, conn, func(tx pgx.Tx) error {
		for _, name := range []string{file, seeds.DemoActivityFile} {
			sql, err := seeds.Files.ReadFile(name)
			if err != nil {
				return fmt.Errorf("read %s: %w", name, err)
			}
			// No arguments → simple protocol, so a file may hold many statements.
			if _, err := tx.Exec(ctx, string(sql)); err != nil {
				return fmt.Errorf("apply %s: %w", name, err)
			}
		}
		return nil
	})
	if err != nil {
		return err
	}
	return report(ctx, conn, scenario)
}

// resolveScenario maps SEED_SCENARIO to its SQL file (default live).
func resolveScenario(value string) (scenario, file string, err error) {
	scenario = strings.TrimSpace(value)
	if scenario == "" {
		scenario = seeds.DefaultScenario
	}
	file, ok := seeds.Scenarios[scenario]
	if !ok {
		return "", "", fmt.Errorf("%s=%q: want prelaunch, live or after-ceremony", envSeedScenario, scenario)
	}
	return scenario, file, nil
}

// localOwnerConfig parses the owner URL and refuses anything but a loopback
// host: the seed deletes and rewrites rows, including auth.users.
func localOwnerConfig(raw string) (*pgx.ConnConfig, error) {
	if strings.TrimSpace(raw) == "" {
		return nil, fmt.Errorf("%s is required (the local postgres owner URL)", envOwnerDatabaseURL)
	}
	cfg, err := pgx.ParseConfig(raw)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", envOwnerDatabaseURL, err)
	}
	if err := dbx.RequireLoopback(&cfg.Config); err != nil {
		return nil, fmt.Errorf("%s: %w", envOwnerDatabaseURL, err)
	}
	return cfg, nil
}

func report(ctx context.Context, conn *pgx.Conn, scenario string) error {
	var startAt, ceremonyAt time.Time
	var users, kudos, hearts, boxes int
	err := conn.QueryRow(ctx, `
		select (select start_at from public.events limit 1),
		       (select ceremony_at from public.events limit 1),
		       (select count(*) from public.users),
		       (select count(*) from public.kudos),
		       (select count(*) from public.hearts),
		       (select count(*) from public.secret_boxes)`).
		Scan(&startAt, &ceremonyAt, &users, &kudos, &hearts, &boxes)
	if err != nil {
		return fmt.Errorf("read seed summary: %w", err)
	}
	slog.Info("seed applied", "scenario", scenario,
		"start_at", startAt.Format(time.RFC3339), "ceremony_at", ceremonyAt.Format(time.RFC3339),
		"users", users, "kudos", kudos, "hearts", hearts, "secret_boxes", boxes)
	return nil
}
