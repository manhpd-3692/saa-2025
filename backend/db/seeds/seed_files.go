// Package seeds embeds the local seed SQL run by cmd/seed (Codex R16).
package seeds

import "embed"

// Files holds the scenario files ({prelaunch,live,after-ceremony}.sql),
// demo_activity.sql and demo_notifications.sql.
//
//go:embed *.sql
var Files embed.FS

// DemoActivityFile is applied after every scenario file.
const DemoActivityFile = "demo_activity.sql"

// DemoNotificationsFile is applied right after DemoActivityFile, in the same
// transaction: it reads that file's temp tables (F009 demo notifications).
const DemoNotificationsFile = "demo_notifications.sql"

// DemoKudoPhoto is the team photo the seed stores at every demo kudo image key: a
// thumbnail cropped from the Figma kudo card (docs/figma-refs/user/kudo-card.png).
//
//go:embed kudo-images/team-photo.png
var DemoKudoPhoto []byte

// DemoKudoPhotoType is the content type of DemoKudoPhoto (bucket allows JPEG/PNG/WebP).
const DemoKudoPhotoType = "image/png"

// Scenarios maps SEED_SCENARIO values to their SQL file.
var Scenarios = map[string]string{
	"prelaunch":      "prelaunch.sql",
	"live":           "live.sql",
	"after-ceremony": "after-ceremony.sql",
}

// DefaultScenario is used when SEED_SCENARIO is unset.
const DefaultScenario = "live"
