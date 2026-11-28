package gamification

import (
	"context"
	"fmt"
	"io"
	"slices"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
)

// IconCount is the size of the collection; holding all of them completes the
// set (BR-010).
const IconCount = 6

// allIcons are the six icons in enum declaration order, which is also the
// order of a Sunner's collected icons.
var allIcons = [IconCount]db.SecretBoxIcon{
	db.SecretBoxIconREVIVAL,
	db.SecretBoxIconTOUCHOFLIGHT,
	db.SecretBoxIconSTAYGOLD,
	db.SecretBoxIconFLOWTOHORIZON,
	db.SecretBoxIconBEYONDTHEBOUNDARY,
	db.SecretBoxIconROOTFURTHER,
}

// uniformByteLimit is the largest multiple of IconCount that fits in a byte;
// bytes at or above it are redrawn so every icon keeps 1/6 odds.
const uniformByteLimit = 256 - 256%IconCount

// drawIcon is ALG-003: one icon with equal odds, repeats allowed, never empty
// (G09, BR-008). Production reads crypto/rand.Reader, so the client cannot
// influence the draw.
func drawIcon(random io.Reader) (db.SecretBoxIcon, error) {
	var b [1]byte
	for {
		if _, err := io.ReadFull(random, b[:]); err != nil {
			return "", fmt.Errorf("draw icon: %w", err)
		}
		if int(b[0]) < uniformByteLimit {
			return allIcons[int(b[0])%IconCount], nil
		}
	}
}

// iconsAfter is the distinct icon set after drawing `drawn`, in enum order.
func iconsAfter(before []db.SecretBoxIcon, drawn db.SecretBoxIcon) []db.SecretBoxIcon {
	after := make([]db.SecretBoxIcon, 0, IconCount)
	for _, icon := range allIcons {
		if icon == drawn || slices.Contains(before, icon) {
			after = append(after, icon)
		}
	}
	return after
}

type iconLister interface {
	ListCollectedIcons(ctx context.Context, userID uuid.UUID) ([]*db.SecretBoxIcon, error)
}

// collectedIcons is the caller's distinct opened icons in enum order, never nil.
func collectedIcons(ctx context.Context, q iconLister, userID uuid.UUID) ([]db.SecretBoxIcon, error) {
	rows, err := q.ListCollectedIcons(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("list collected icons: %w", err)
	}
	icons := make([]db.SecretBoxIcon, 0, len(rows))
	for _, icon := range rows {
		if icon != nil {
			icons = append(icons, *icon)
		}
	}
	return icons, nil
}
