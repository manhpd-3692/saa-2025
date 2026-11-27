package dbx

import (
	"fmt"
	"net"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"
)

// RequireLoopback refuses a connection config whose host (or any fallback host)
// is not loopback. Local tooling that rewrites data with the owner role — the
// seed runner and integration-test fixtures — must never reach a hosted DB.
func RequireLoopback(cfg *pgconn.Config) error {
	hosts := []string{cfg.Host}
	for _, fallback := range cfg.Fallbacks {
		hosts = append(hosts, fallback.Host)
	}
	for _, host := range hosts {
		if !IsLoopbackHost(host) {
			return fmt.Errorf("database host %q is not local; refusing to run against it", host)
		}
	}
	return nil
}

// IsLoopbackHost reports whether host is localhost or a loopback IP (127.0.0.0/8, ::1).
func IsLoopbackHost(host string) bool {
	if strings.EqualFold(host, "localhost") {
		return true
	}
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}
