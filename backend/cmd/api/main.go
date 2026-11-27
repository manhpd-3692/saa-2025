// Command api is the SAA 2025 Go REST API (/api/v1). It owns every business
// read/write and all authorization; Next.js is frontend only (G15–G19).
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/manhpd-3692/saa-2025/backend/internal/auth"
	"github.com/manhpd-3692/saa-2025/backend/internal/config"
	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// HTTP server deadlines (Codex R23).
const (
	readHeaderTimeout = 5 * time.Second
	readTimeout       = 15 * time.Second
	writeTimeout      = 30 * time.Second
	idleTimeout       = 60 * time.Second
	// shutdownTimeout lets in-flight requests finish (bounded by writeTimeout).
	shutdownTimeout = writeTimeout
	startupPingWait = 5 * time.Second
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)
	if err := run(logger); err != nil {
		logger.Error("api stopped", "error", err)
		os.Exit(1)
	}
}

func run(logger *slog.Logger) error {
	cfg, err := config.Load(os.Getenv)
	if err != nil {
		return err
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := openPool(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	verifier, err := auth.NewJWKSVerifier(ctx, cfg.JWKSURL, cfg.JWTIssuer)
	if err != nil {
		return err
	}
	queries := db.New(pool)
	authMW := auth.NewMiddleware(verifier, queries)
	routes, err := httpx.NewRouteClasses(authMW.RequireIdentity, authMW.RequireProfile, auth.RequireAdmin)
	if err != nil {
		return err
	}
	deps := apiDeps{Config: cfg, Logger: logger, Pool: pool, Queries: queries, Routes: routes}

	server := &http.Server{
		Addr:              cfg.APIAddr,
		Handler:           newRouter(deps, routeRegistrations),
		ReadHeaderTimeout: readHeaderTimeout,
		ReadTimeout:       readTimeout,
		WriteTimeout:      writeTimeout,
		IdleTimeout:       idleTimeout,
		ErrorLog:          slog.NewLogLogger(logger.Handler(), slog.LevelWarn),
	}
	return serve(ctx, server, logger)
}

// openPool connects as saa_api and fails fast when the database is unreachable.
func openPool(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("open database pool: %w", err)
	}
	pingCtx, cancel := context.WithTimeout(ctx, startupPingWait)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}
	return pool, nil
}

// serve runs the server until ctx is cancelled (SIGINT/SIGTERM), then shuts
// down gracefully, letting in-flight requests finish.
func serve(ctx context.Context, server *http.Server, logger *slog.Logger) error {
	errCh := make(chan error, 1)
	go func() {
		logger.Info("api listening", "addr", server.Addr)
		errCh <- server.ListenAndServe()
	}()

	select {
	case err := <-errCh:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return fmt.Errorf("listen: %w", err)
	case <-ctx.Done():
	}

	logger.Info("api shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), shutdownTimeout)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("graceful shutdown: %w", err)
	}
	return nil
}
