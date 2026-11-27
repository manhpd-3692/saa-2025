package main

import "testing"

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
