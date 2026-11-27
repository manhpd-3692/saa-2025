// Package notification owns the notifications table (F009). Other Go services
// create rows only through Service.Create after their own transaction commits
// (INT-001); there is no HTTP route or Postgres function that writes them.
package notification

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// Kind is one of exactly seven notification kinds (F009 FR-002, Codex R14).
type Kind string

// The seven kinds; `review_requested` and the old `spam_warning` do not exist (G10, R14).
const (
	KindKudoReceived      Kind = "kudo_received"
	KindHeartReceived     Kind = "heart_received"
	KindSecretBoxReceived Kind = "secret_box_received"
	KindHeroLevelUp       Kind = "hero_level_up"
	KindKudoSpamWarning   Kind = "kudo_spam_warning"
	KindIconsCompleted    Kind = "icons_completed"
	KindGeneric           Kind = "generic"
)

// Valid reports whether k is one of the seven kinds.
func (k Kind) Valid() bool {
	switch k {
	case KindKudoReceived, KindHeartReceived, KindSecretBoxReceived, KindHeroLevelUp,
		KindKudoSpamWarning, KindIconsCompleted, KindGeneric:
		return true
	}
	return false
}

// onceEver reports whether k is stored at most once per recipient and dedupe
// key, whatever its read state (Codex N03).
func (k Kind) onceEver() bool { return k == KindHeroLevelUp || k == KindIconsCompleted }

// Sender params of a kudo-linked notice. They are stripped whenever the kudo is
// anonymous at insert time (BR-002, Codex N01) and never re-added.
const (
	ParamSenderID        = "senderId"
	ParamSenderName      = "senderName"
	ParamSenderAvatarURL = "senderAvatarUrl"
)

var senderParams = [...]string{ParamSenderID, ParamSenderName, ParamSenderAvatarURL}

// CreateInput is one notification request (F009 A1). ActorID is used only for
// the self-action rule (BR-003) and is never stored.
type CreateInput struct {
	RecipientID uuid.UUID
	ActorID     uuid.UUID
	Kind        Kind
	Params      map[string]any
	KudoID      *uuid.UUID
	DedupeKey   string
}

// Notifier creates a notification and never reports a failure the caller must
// handle (BR-006). Producers (kudo, gamification, moderation) depend on this
// interface; *Service implements it.
type Notifier interface {
	Create(ctx context.Context, in CreateInput)
}

// PostCommitTimeout bounds post-commit notification work (Codex R23).
const PostCommitTimeout = 2 * time.Second

// PostCommitContext derives the context a producer passes to Create after its
// transaction committed: detached from the request (a client disconnect does not
// cancel it) and bounded to 2 s, so a stalled database cannot hold the response.
func PostCommitContext(parent context.Context) (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.WithoutCancel(parent), PostCommitTimeout)
}

// HeroTransition is F005's tier rise handed to the notifier (Codex N04).
// FromTier is empty when the receiver had no tier before.
type HeroTransition struct {
	ReceiverID   uuid.UUID
	ActorID      uuid.UUID
	FromTier     string
	ToTier       string
	SendersCount int
}

// HeroLevelUpInput maps a transition to its notice: params levelKey,
// fromLevelKey (null without a previous tier) and sendersCount, dedupe
// `hero_level:{receiverId}:{toTier}`, one notice per tier ever (N03, N04).
func HeroLevelUpInput(t HeroTransition) CreateInput {
	var from any
	if t.FromTier != "" {
		from = t.FromTier
	}
	return CreateInput{
		RecipientID: t.ReceiverID,
		ActorID:     t.ActorID,
		Kind:        KindHeroLevelUp,
		Params:      map[string]any{"levelKey": t.ToTier, "fromLevelKey": from, "sendersCount": t.SendersCount},
		DedupeKey:   fmt.Sprintf("hero_level:%s:%s", t.ReceiverID, t.ToTier),
	}
}
