package main

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/manhpd-3692/saa-2025/backend/db/seeds"
	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
)

const (
	envSupabaseURL        = "SUPABASE_URL"
	envSupabaseServiceKey = "SUPABASE_SERVICE_KEY"
	storageUploadTimeout  = 10 * time.Second
)

// demoStorage is the local Storage API the demo images go to (service key, upsert).
type demoStorage struct {
	base string // ${SUPABASE_URL}/storage/v1
	key  string
}

// localStorage builds the Storage target and refuses anything but a loopback host,
// like the database guard: the seed overwrites objects.
func localStorage(rawURL, key string) (demoStorage, error) {
	rawURL, key = strings.TrimRight(strings.TrimSpace(rawURL), "/"), strings.TrimSpace(key)
	if rawURL == "" || key == "" {
		return demoStorage{}, fmt.Errorf("%s and %s are required to upload the demo kudo images", envSupabaseURL, envSupabaseServiceKey)
	}
	parsed, err := url.Parse(rawURL)
	if err != nil || parsed.Hostname() == "" {
		return demoStorage{}, fmt.Errorf("%s=%q is not a URL", envSupabaseURL, rawURL)
	}
	if !dbx.IsLoopbackHost(parsed.Hostname()) {
		return demoStorage{}, fmt.Errorf("%s host %q is not local; refusing to upload", envSupabaseURL, parsed.Hostname())
	}
	return demoStorage{base: rawURL + "/storage/v1", key: key}, nil
}

// uploadDemoKudoImages stores the demo photo at the opaque key of every attached
// demo upload (written by demo_activity.sql, Codex R01) and records its size. The
// keys are fixed, so a reseed overwrites the same objects instead of orphaning them.
func uploadDemoKudoImages(ctx context.Context, conn *pgx.Conn, storage demoStorage) (int, error) {
	rows, err := conn.Query(ctx, `
		select u.id::text, u.object_path from public.kudo_uploads u
		join public.users p on p.id = u.owner_id
		where p.email like '%.demo@sun-asterisk.com' and u.state = 'attached'
		order by u.object_path`)
	if err != nil {
		return 0, fmt.Errorf("list demo uploads: %w", err)
	}
	type upload struct{ id, path string }
	var uploads []upload
	for rows.Next() {
		var u upload
		if err := rows.Scan(&u.id, &u.path); err != nil {
			return 0, fmt.Errorf("read demo upload: %w", err)
		}
		uploads = append(uploads, u)
	}
	if err := rows.Err(); err != nil {
		return 0, fmt.Errorf("list demo uploads: %w", err)
	}
	for _, u := range uploads {
		if err := storage.put(ctx, u.path, seeds.DemoKudoPhotoType, seeds.DemoKudoPhoto); err != nil {
			return 0, err
		}
		if _, err := conn.Exec(ctx, `update public.kudo_uploads set size_bytes = $1 where id = $2::uuid`, len(seeds.DemoKudoPhoto), u.id); err != nil {
			return 0, fmt.Errorf("record size of %s: %w", u.path, err)
		}
	}
	return len(uploads), nil
}

// put writes one object (`kudo-images/{name}`) with upsert, as the service role.
func (s demoStorage) put(ctx context.Context, objectPath, contentType string, body []byte) error {
	ctx, cancel := context.WithTimeout(ctx, storageUploadTimeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.base+"/object/"+objectPath, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+s.key)
	req.Header.Set("apikey", s.key)
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("x-upsert", "true")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("upload %s: %w", objectPath, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		msg, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return errors.New("upload " + objectPath + ": " + resp.Status + " " + string(msg))
	}
	return nil
}
