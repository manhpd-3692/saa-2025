package moderation

import (
	"net/http"

	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// peopleOptions is the A2 answer: the Sender or Receiver filter choices.
type peopleOptions struct {
	Items []ReviewPerson `json:"items"`
}

// NewPeopleHandler serves GET /api/v1/admin/kudos/people?role=sender|receiver&q
// (A2, BR-009): people who sent (or received) a kudo, by name, at most 20.
// A missing or unknown role is 400 (it picks which list, so it is not a filter).
func NewPeopleHandler(reviews *ReviewService) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, ok := adminCaller(w, r); !ok {
			return
		}
		role := r.URL.Query().Get("role")
		if role != "sender" && role != "receiver" {
			httpx.WriteError(w, http.StatusBadRequest, CodeInvalidRequest, "role must be sender or receiver.")
			return
		}
		people, err := reviews.People(r.Context(), role == "sender", r.URL.Query().Get("q"))
		if err != nil {
			httpx.LogRequestFailure(r, err, "read admin review people", "role", role)
			httpx.WriteInternalError(w)
			return
		}
		httpx.WriteJSON(w, http.StatusOK, peopleOptions{Items: people})
	})
}
