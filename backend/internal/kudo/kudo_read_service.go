package kudo

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
	"github.com/manhpd-3692/saa-2025/backend/internal/gamification"
	"github.com/manhpd-3692/saa-2025/backend/internal/upload"
)

// ErrKudoNotFound covers a missing kudo and one the viewer may not see
// (BR-006): both answer the same 404, so ids cannot be probed.
var ErrKudoNotFound = errors.New("kudo not found")

// SignedURLTTL is SIGNED_URL_TTL_SECONDS (F006 INT-001).
const SignedURLTTL = time.Hour

// ReadService is KudoReadService (F006 A0): every kudo read builds the KudoCard
// through maskSender, the weighted heart total and Go-signed image URLs.
type ReadService struct {
	queries *db.Queries
	store   upload.ObjectStore
}

// NewReadService wires the pool queries and the Storage client.
func NewReadService(queries *db.Queries, store upload.ObjectStore) *ReadService {
	return &ReadService{queries: queries, store: store}
}

// Get is F006 A7: one kudo as a KudoCard. A kudo is viewable when it is
// public, or the viewer is its sender or an admin (BR-006).
func (s *ReadService) Get(ctx context.Context, viewer Viewer, id uuid.UUID) (KudoCard, error) {
	dbCtx, cancel := dbx.RequestContext(ctx)
	defer cancel()
	row, err := s.queries.GetKudoForRead(dbCtx, db.GetKudoForReadParams{ViewerID: viewer.ID, ID: id})
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		return KudoCard{}, ErrKudoNotFound
	case err != nil:
		return KudoCard{}, fmt.Errorf("read kudo: %w", err)
	}
	if row.Status != db.KudoStatusPublic && row.SenderID != viewer.ID && !viewer.IsAdmin {
		return KudoCard{}, ErrKudoNotFound
	}
	hashtags, err := s.queries.ListKudoHashtagNames(dbCtx, id)
	if err != nil {
		return KudoCard{}, fmt.Errorf("read kudo hashtags: %w", err)
	}
	paths, err := s.queries.ListKudoImageObjectPaths(dbCtx, id)
	if err != nil {
		return KudoCard{}, fmt.Errorf("read kudo images: %w", err)
	}
	tiers, err := gamification.HeroTiersFor(dbCtx, s.queries, []uuid.UUID{row.SenderID, row.ReceiverID})
	if err != nil {
		return KudoCard{}, err
	}

	card := KudoCard{
		ID: row.ID, CreatedAt: row.CreatedAt, Title: row.Title, ContentHTML: row.Content,
		IsAnonymous: row.IsAnonymous, Status: row.Status, Hashtags: nonNil(hashtags),
		Sender: &PersonCard{
			ID: row.SenderID, Name: row.SenderName, AvatarURL: row.SenderAvatarUrl,
			UnitCode: row.SenderUnitCode, HeroTier: tierOrNil(tiers[row.SenderID]),
		},
		Receiver: PersonCard{
			ID: row.ReceiverID, Name: row.ReceiverName, AvatarURL: row.ReceiverAvatarUrl,
			UnitCode: row.ReceiverUnitCode, HeroTier: tierOrNil(tiers[row.ReceiverID]),
		},
		Images: s.signImages(ctx, id, paths),
		Heart: HeartCard{
			Total: row.HeartTotal, ViewerHearted: row.ViewerHearted,
			ViewerCanHeart: row.Status == db.KudoStatusPublic && row.SenderID != viewer.ID, // G06
		},
	}
	maskSender(&card, row.SenderID, viewer)
	return card, nil
}

// signImages signs every opaque key in one batch; a key that cannot be signed
// (or a Storage failure) yields a null URL instead of failing the card.
func (s *ReadService) signImages(ctx context.Context, kudoID uuid.UUID, paths []string) []ImageCard {
	images := make([]ImageCard, len(paths))
	if len(paths) == 0 {
		return images
	}
	signed, err := s.store.SignReadURLs(ctx, paths, SignedURLTTL)
	if err != nil {
		slog.WarnContext(ctx, "sign kudo image URLs", "kudo_id", kudoID, "error", err)
	}
	for i, p := range paths {
		if u, ok := signed[p]; ok {
			images[i].URL = &u
		}
	}
	return images
}

func tierOrNil(t gamification.HeroTier) *string {
	if t == gamification.TierNone {
		return nil
	}
	s := string(t)
	return &s
}

func nonNil(values []string) []string {
	if values == nil {
		return []string{}
	}
	return values
}
