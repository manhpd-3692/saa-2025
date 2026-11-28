//go:build integration

package main

import (
	"net/http"
	"strings"
	"testing"

	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

// SC-004, BR-007, FR-601 (safety-critical: the full admin authz matrix) on the
// assembled router: every F010 endpoint answers 401 without a valid token and
// 403 to a user-role Sunner with no data in the body, and serves an admin. The
// exports expose Content-Disposition to the frontend origin (Codex R06, SC-008).
func TestAdminReportEndpointsAuthorizationMatrix(t *testing.T) {
	h := newAPIHarness(t)
	_, userToken := h.sunner(testkit.SunnerSpec{Name: "Report Viewer"})
	_, adminToken := h.sunner(testkit.SunnerSpec{Name: "Report Admin", Admin: true})

	endpoints := []string{
		"/api/v1/admin/overview?from=2003-02-10&to=2003-02-12",
		"/api/v1/admin/overview/export?from=2003-02-10&to=2003-02-12",
		"/api/v1/admin/users?q=report&pageSize=8",
		"/api/v1/admin/users/export?q=report",
	}
	for _, path := range endpoints {
		if res := h.do(http.MethodGet, path, "", nil); res.Status != http.StatusUnauthorized {
			t.Errorf("%s without a token: %d %s, want 401", path, res.Status, res.Body)
		}
		if res := h.do(http.MethodGet, path, "not-a-jwt", nil); res.Status != http.StatusUnauthorized {
			t.Errorf("%s with an invalid token: %d, want 401", path, res.Status)
		}
		res := h.do(http.MethodGet, path, userToken, nil)
		if res.Status != http.StatusForbidden || res.errorCode(t) != "forbidden" {
			t.Errorf("%s as a user: %d %s, want 403 forbidden", path, res.Status, res.Body)
		}
		if body := string(res.Body); strings.Contains(body, "Report Admin") || strings.Contains(body, "rows") || res.Header.Get("Content-Disposition") != "" {
			t.Errorf("%s as a user leaked data: %s %v", path, body, res.Header)
		}

		res = h.do(http.MethodGet, path, adminToken, nil)
		if res.Status != http.StatusOK {
			t.Errorf("%s as an admin: %d %s, want 200", path, res.Status, res.Body)
			continue
		}
		if strings.Contains(path, "/export") {
			if got := res.Header.Get("Access-Control-Expose-Headers"); !strings.Contains(got, "Content-Disposition") {
				t.Errorf("%s: Access-Control-Expose-Headers %q, want Content-Disposition (R06)", path, got)
			}
			if !strings.HasPrefix(res.Header.Get("Content-Disposition"), "attachment; filename=saa-") ||
				!strings.HasPrefix(string(res.Body), "\xEF\xBB\xBF") {
				t.Errorf("%s: Content-Disposition %q, body %.20q", path, res.Header.Get("Content-Disposition"), res.Body)
			}
		}
	}
}
