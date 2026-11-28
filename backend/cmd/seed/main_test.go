package main

import (
	"strings"
	"testing"
)

func TestResolveScenario(t *testing.T) {
	tests := map[string]struct {
		value, wantScenario, wantFile string
		wantErr                       bool
	}{
		"default":        {"", "live", "live.sql", false},
		"prelaunch":      {"prelaunch", "prelaunch", "prelaunch.sql", false},
		"after-ceremony": {" after-ceremony ", "after-ceremony", "after-ceremony.sql", false},
		"unknown":        {"production", "", "", true},
	}
	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			scenario, file, err := resolveScenario(tc.value)
			if (err != nil) != tc.wantErr || scenario != tc.wantScenario || file != tc.wantFile {
				t.Fatalf("resolveScenario(%q) = %q, %q, %v", tc.value, scenario, file, err)
			}
		})
	}
}

// The seed overwrites Storage objects (the demo kudo images): only a local Storage API.
func TestLocalStorageRefusesNonLoopbackHosts(t *testing.T) {
	for _, raw := range []string{"http://127.0.0.1:54321", "http://localhost:54321/"} {
		if s, err := localStorage(raw, "key"); err != nil || s.base != strings.TrimRight(raw, "/")+"/storage/v1" {
			t.Errorf("localStorage(%q) = %+v, %v; want accepted", raw, s, err)
		}
	}
	for _, tc := range []struct{ url, key string }{
		{"https://abc.supabase.co", "key"},
		{"http://127.0.0.1:54321", ""},
		{"", "key"},
		{"not a url", "key"},
	} {
		if _, err := localStorage(tc.url, tc.key); err == nil {
			t.Errorf("localStorage(%q, %q) accepted", tc.url, tc.key)
		}
	}
}

// The seed rewrites auth.users and business rows: it must never reach a remote host.
func TestLocalOwnerConfigRefusesNonLoopbackHosts(t *testing.T) {
	for _, raw := range []string{
		"postgres://postgres:pw@127.0.0.1:54322/postgres",
		"postgres://postgres:pw@localhost:54322/postgres",
		"postgres://postgres:pw@[::1]:54322/postgres",
	} {
		if _, err := localOwnerConfig(raw); err != nil {
			t.Errorf("localOwnerConfig(%q) = %v, want accepted", raw, err)
		}
	}
	for _, raw := range []string{
		"",
		"postgres://postgres:pw@db.example.supabase.co:5432/postgres",
		"postgres://postgres:pw@127.0.0.1:54322,db.example.com:5432/postgres",
	} {
		if _, err := localOwnerConfig(raw); err == nil {
			t.Errorf("localOwnerConfig(%q) accepted a non-local target", raw)
		}
	}
}
