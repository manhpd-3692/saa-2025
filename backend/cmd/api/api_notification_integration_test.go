//go:build integration

package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"
	"testing"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/notification"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

type noticeItem struct {
	ID            string         `json:"id"`
	Kind          string         `json:"kind"`
	Params        map[string]any `json:"params"`
	KudoID        *string        `json:"kudoId"`
	KudoAvailable bool           `json:"kudoAvailable"`
	ReadAt        *string        `json:"readAt"`
	CreatedAt     string         `json:"createdAt"`
}

// notices reads every page of the caller's notification list through the router.
func (h *apiHarness) notices(token string) []noticeItem {
	h.t.Helper()
	var all []noticeItem
	cursor := ""
	for page := 0; page < 50; page++ {
		path := "/api/v1/me/notifications?limit=2"
		if cursor != "" {
			path += "&cursor=" + url.QueryEscape(cursor)
		}
		got := h.do(http.MethodGet, path, token, nil)
		var body struct {
			Items      []noticeItem `json:"items"`
			NextCursor *string      `json:"nextCursor"`
		}
		if got.Status != http.StatusOK || json.Unmarshal(got.Body, &body) != nil || body.Items == nil {
			h.t.Fatalf("list notifications = %d %s", got.Status, got.Body)
		}
		all = append(all, body.Items...)
		if body.NextCursor == nil {
			return all
		}
		cursor = *body.NextCursor
	}
	h.t.Fatal("paging never ended")
	return nil
}

func (h *apiHarness) unreadCount(token string) float64 {
	h.t.Helper()
	got := h.do(http.MethodGet, "/api/v1/me/notifications/unread-count", token, nil)
	count, ok := got.json(h.t)["unreadCount"].(float64)
	if got.Status != http.StatusOK || !ok {
		h.t.Fatalf("unread count = %d %s", got.Status, got.Body)
	}
	return count
}

func kudoNotices(items []noticeItem, kudoID string) []noticeItem {
	var out []noticeItem
	for _, item := range items {
		if item.Kind == "kudo_received" && item.KudoID != nil && *item.KudoID == kudoID {
			out = append(out, item)
		}
	}
	return out
}

// F009 A2, A4, A6, A7 through the assembled router (PROFILE routes):
// SC-012 sequence — named create (notice 1) → anonymous edit → late notice 2
// sent with the named params → edit back to named → neither notice shows the
// sender, in the list or in its stored params (R02, N01); the unread count
// follows the rows; another Sunner cannot mark the notice (404, row unchanged)
// and a malformed id is the same 404 (SC-005); read-all clears only the caller
// (SC-006); no route creates or deletes a notification (FR-602); a foreign
// cursor is 400.
func TestNotificationCenterThroughTheRouter(t *testing.T) {
	h := newAPIHarness(t)
	recipient, recipientToken := h.sunner(testkit.SunnerSpec{Name: "Notice Recipient"})
	_, senderToken := h.sunner(testkit.SunnerSpec{Name: "Notice Sender"})
	other, otherToken := h.sunner(testkit.SunnerSpec{})

	kudoID := h.createKudo(senderToken, recipient, "teamwork")
	first := kudoNotices(h.notices(recipientToken), kudoID)
	if len(first) != 1 || first[0].Params[notification.ParamSenderName] != "Notice Sender" || first[0].ReadAt != nil {
		t.Fatalf("named kudo notice = %+v, want one unread notice naming the sender", first)
	}
	edit := map[string]any{"title": "Compose", "contentHtml": "<p>Thanks!</p>", "hashtags": []string{"teamwork"}, "imageUploadIds": []string{}}
	edit["isAnonymous"] = true
	if got := h.do(http.MethodPatch, "/api/v1/kudos/"+kudoID, senderToken, edit); got.Status != http.StatusOK {
		t.Fatalf("anonymous edit = %d %s", got.Status, got.Body)
	}
	kudo := uuid.MustParse(kudoID)
	ctx, cancel := notification.PostCommitContext(context.Background())
	notification.NewService(h.db.App).Create(ctx, notification.CreateInput{
		RecipientID: recipient, ActorID: uuid.New(), Kind: notification.KindKudoReceived, KudoID: &kudo,
		Params: map[string]any{notification.ParamSenderName: "Notice Sender", notification.ParamSenderID: uuid.NewString()},
	})
	cancel()
	edit["isAnonymous"] = false
	if got := h.do(http.MethodPatch, "/api/v1/kudos/"+kudoID, senderToken, edit); got.Status != http.StatusOK {
		t.Fatalf("named edit = %d %s", got.Status, got.Body)
	}

	items := h.notices(recipientToken)
	both := kudoNotices(items, kudoID)
	if len(both) != 2 {
		t.Fatalf("kudo notices = %+v, want the first and the late one", both)
	}
	for _, item := range both {
		for _, key := range []string{notification.ParamSenderID, notification.ParamSenderName, notification.ParamSenderAvatarURL} {
			if _, ok := item.Params[key]; ok {
				t.Errorf("notice %s still carries %s after anonymity was on: %v", item.ID, key, item.Params)
			}
		}
		if stored := h.scalar(`select params::text from public.notifications where id = $1`, item.ID); stored != "{}" {
			t.Errorf("stored params of %s = %s, want no sender fields", item.ID, stored)
		}
		if !item.KudoAvailable {
			t.Errorf("notice %s: kudoAvailable false for a public kudo", item.ID)
		}
	}
	unread := 0
	for _, item := range items {
		if item.ReadAt == nil {
			unread++
		}
	}
	if got := h.unreadCount(recipientToken); got != float64(unread) || unread < 2 {
		t.Fatalf("unread count = %v, want %d unread rows", got, unread)
	}

	readPath := "/api/v1/me/notifications/" + both[0].ID + "/read"
	if got := h.do(http.MethodPost, readPath, otherToken, nil); got.Status != http.StatusNotFound || got.errorCode(t) != "notification_not_found" {
		t.Fatalf("another Sunner marking it = %d %s, want 404 notification_not_found", got.Status, got.Body)
	}
	if got := h.do(http.MethodPost, "/api/v1/me/notifications/not-a-uuid/read", recipientToken, nil); got.Status != http.StatusNotFound {
		t.Fatalf("malformed id = %d %s, want 404", got.Status, got.Body)
	}
	if h.scalar(`select (read_at is null)::text from public.notifications where id = $1`, both[0].ID) != "true" {
		t.Fatal("a refused mark-read changed the row")
	}
	if got := h.do(http.MethodPost, readPath, recipientToken, nil); got.Status != http.StatusNoContent {
		t.Fatalf("own mark-read = %d %s, want 204", got.Status, got.Body)
	}
	if got := h.unreadCount(recipientToken); got != float64(unread-1) {
		t.Fatalf("unread after one read = %v, want %d", got, unread-1)
	}

	otherKudo := h.createKudo(senderToken, other, "teamwork")
	otherUnread := h.unreadCount(otherToken)
	if otherUnread < 1 || len(kudoNotices(h.notices(otherToken), otherKudo)) != 1 {
		t.Fatalf("other Sunner unread = %v, want their own kudo notice", otherUnread)
	}
	all := h.do(http.MethodPost, "/api/v1/me/notifications/read-all", recipientToken, nil)
	if all.Status != http.StatusOK || all.json(t)["markedRead"] != float64(unread-1) {
		t.Fatalf("read-all = %d %s, want 200 markedRead %d", all.Status, all.Body, unread-1)
	}
	if h.unreadCount(recipientToken) != 0 || h.unreadCount(otherToken) != otherUnread {
		t.Fatal("read-all must clear the caller only")
	}

	for _, refused := range []struct{ method, path string }{
		{http.MethodPost, "/api/v1/me/notifications"},
		{http.MethodPut, "/api/v1/me/notifications/" + both[0].ID},
		{http.MethodPatch, "/api/v1/me/notifications/" + both[0].ID},
		{http.MethodDelete, "/api/v1/me/notifications/" + both[0].ID},
	} {
		if got := h.do(refused.method, refused.path, recipientToken, map[string]any{"kind": "generic"}); got.Status < 400 {
			t.Errorf("%s %s = %d, want no route that writes notifications", refused.method, refused.path, got.Status)
		}
	}
	if h.scalar(`select count(*)::text from public.notifications where id = $1`, both[0].ID) != "1" {
		t.Fatal("a refused call removed the notice")
	}
	if got := h.do(http.MethodGet, "/api/v1/me/notifications?cursor=bm90LWEtY3Vyc29y", recipientToken, nil); got.Status != http.StatusBadRequest || got.errorCode(t) != "invalid_cursor" {
		t.Fatalf("foreign cursor = %d %s, want 400 invalid_cursor", got.Status, got.Body)
	}
}
