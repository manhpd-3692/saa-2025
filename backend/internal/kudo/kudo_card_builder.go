package kudo

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
	"github.com/manhpd-3692/saa-2025/backend/internal/gamification"
)

// cardRow is the one row shape every kudo-returning query selects
// (GetKudoForRead, ListPublicKudoCards, ListHighlightKudoCards). The struct
// conversions from the other rows stop compiling if a query's columns drift.
type cardRow db.GetKudoForReadRow

// buildCards turns rows into KudoCards for one viewer (F006 § 4.2): hashtags,
// images and hero tiers are read for the whole page in three queries, image
// keys are signed in one batch, and every card goes through maskSender.
func (s *ReadService) buildCards(ctx context.Context, viewer Viewer, rows []cardRow) ([]KudoCard, error) {
	cards := make([]KudoCard, len(rows))
	if len(rows) == 0 {
		return cards, nil
	}
	ids := make([]uuid.UUID, len(rows))
	people := make([]uuid.UUID, 0, 2*len(rows))
	for i, row := range rows {
		ids[i] = row.ID
		people = append(people, row.SenderID, row.ReceiverID)
	}

	dbCtx, cancel := dbx.RequestContext(ctx)
	defer cancel()
	tagRows, err := s.queries.ListHashtagNamesForKudos(dbCtx, ids)
	if err != nil {
		return nil, fmt.Errorf("read kudo hashtags: %w", err)
	}
	imageRows, err := s.queries.ListImageObjectPathsForKudos(dbCtx, ids)
	if err != nil {
		return nil, fmt.Errorf("read kudo images: %w", err)
	}
	tiers, err := gamification.HeroTiersFor(dbCtx, s.queries, people)
	if err != nil {
		return nil, err
	}

	hashtags := make(map[uuid.UUID][]string, len(rows))
	for _, tag := range tagRows {
		hashtags[tag.KudoID] = append(hashtags[tag.KudoID], tag.Name)
	}
	paths := make(map[uuid.UUID][]string, len(rows))
	allPaths := make([]string, 0, len(imageRows))
	for _, image := range imageRows {
		paths[image.KudoID] = append(paths[image.KudoID], image.ObjectPath)
		allPaths = append(allPaths, image.ObjectPath)
	}
	signed := s.signPaths(ctx, allPaths)

	for i, row := range rows {
		cards[i] = newCard(row, viewer, nonNil(hashtags[row.ID]), imageCards(paths[row.ID], signed), tiers)
	}
	return cards, nil
}

// newCard is one KudoCard, masked for the viewer (BR-002) with isOwn and the
// heart state (G06: the real sender never hearts their own kudo).
func newCard(row cardRow, viewer Viewer, hashtags []string, images []ImageCard, tiers map[uuid.UUID]gamification.HeroTier) KudoCard {
	card := KudoCard{
		ID: row.ID, CreatedAt: row.CreatedAt, Title: row.Title, ContentHTML: row.Content,
		IsAnonymous: row.IsAnonymous, Status: row.Status, Hashtags: hashtags, Images: images,
		Sender: &PersonCard{
			ID: row.SenderID, Name: row.SenderName, AvatarURL: row.SenderAvatarUrl,
			UnitCode: row.SenderUnitCode, HeroTier: tierOrNil(tiers[row.SenderID]),
		},
		Receiver: PersonCard{
			ID: row.ReceiverID, Name: row.ReceiverName, AvatarURL: row.ReceiverAvatarUrl,
			UnitCode: row.ReceiverUnitCode, HeroTier: tierOrNil(tiers[row.ReceiverID]),
		},
		Heart: HeartCard{
			Total: row.HeartTotal, ViewerHearted: row.ViewerHearted,
			ViewerCanHeart: row.Status == db.KudoStatusPublic && row.SenderID != viewer.ID,
		},
	}
	maskSender(&card, row.SenderID, viewer)
	return card
}

// signPaths signs every opaque key of a response in one batch (INT-001). A
// Storage failure is logged and yields no URLs instead of failing the response.
func (s *ReadService) signPaths(ctx context.Context, paths []string) map[string]string {
	if len(paths) == 0 {
		return nil
	}
	signed, err := s.store.SignReadURLs(ctx, paths, SignedURLTTL)
	if err != nil {
		slog.WarnContext(ctx, "sign kudo image URLs", "count", len(paths), "error", err)
	}
	return signed
}

// imageCards keeps the sender's order; a key that could not be signed gets a
// null URL, so the card shows a placeholder.
func imageCards(paths []string, signed map[string]string) []ImageCard {
	images := make([]ImageCard, len(paths))
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
