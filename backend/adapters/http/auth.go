package httpadapter

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"

	authsvc "no-trust-cms-backend/services/auth"
)

type AuthHandler struct {
	svc *authsvc.Service
}

func NewAuthHandler(svc *authsvc.Service) *AuthHandler {
	return &AuthHandler{svc: svc}
}

func (h *AuthHandler) Register(mux *http.ServeMux, mw func(http.HandlerFunc) http.HandlerFunc) {
	mux.HandleFunc("/auth/nonce", mw(h.HandleNonce))
	mux.HandleFunc("/auth/verify", mw(h.HandleVerify))
	mux.HandleFunc("/auth/me", mw(h.HandleMe))
	mux.HandleFunc("/auth/logout", mw(h.HandleLogout))
}

func (h *AuthHandler) HandleNonce(w http.ResponseWriter, r *http.Request) {
	addr := strings.ToLower(r.URL.Query().Get("address"))
	if addr == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing address"})
		return
	}
	nonce, err := h.svc.GenerateNonce(addr)
	if err != nil {
		log.Printf("GenerateNonce: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"nonce": nonce})
}

func (h *AuthHandler) HandleVerify(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Message   string `json:"message"`
		Signature string `json:"signature"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}
	address, token, err := h.svc.VerifyAndIssueToken(body.Message, body.Signature)
	if err != nil {
		switch {
		case errors.Is(err, authsvc.ErrInvalidSIWEMessage):
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid SIWE message"})
		case errors.Is(err, authsvc.ErrSignatureInvalid):
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "signature invalid"})
		case errors.Is(err, authsvc.ErrNonceExpired):
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "nonce expired or invalid"})
		default:
			log.Printf("VerifyAndIssueToken: %v", err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
		}
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"address": address, "token": token})
}

func (h *AuthHandler) HandleMe(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "not authenticated"})
		return
	}
	address, err := h.svc.ValidateToken(strings.TrimPrefix(authHeader, "Bearer "))
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid session"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"address": address})
}

func (h *AuthHandler) HandleLogout(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"ok": "logged out"})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
