// Package seeds embeds the local seed SQL run by cmd/seed (Codex R16).
package seeds

import "embed"

// Files holds the scenario files ({prelaunch,live,after-ceremony}.sql) and
// demo_activity.sql.
//
//go:embed *.sql
var Files embed.FS

// DemoActivityFile is applied after every scenario file.
const DemoActivityFile = "demo_activity.sql"

// Scenarios maps SEED_SCENARIO values to their SQL file.
var Scenarios = map[string]string{
	"prelaunch":      "prelaunch.sql",
	"live":           "live.sql",
	"after-ceremony": "after-ceremony.sql",
}

// DefaultScenario is used when SEED_SCENARIO is unset.
const DefaultScenario = "live"
