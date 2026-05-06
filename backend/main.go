// Run: go run main.go (requires Go 1.21+)
// Deps: go mod init no-trust-cms-backend && go get github.com/spruceid/siwe-go github.com/golang-jwt/jwt/v5
// Env: JWT_SECRET (optional, defaults to insecure dev value)
package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	siwe "github.com/spruceid/siwe-go"
)

const (
	port        = ":8080"
	nonceTTL    = 5 * time.Minute
	jwtTTL      = 24 * time.Hour
	corsOrigin  = "http://localhost:3000"
	devJWTSecret = "dev-secret-change-in-production"
)

type nonceEntry struct {
	nonce     string
	expiresAt time.Time
}

var (
	nonces   = map[string]nonceEntry{}
	noncesMu sync.Mutex
)

func jwtSecret() []byte {
	if s := os.Getenv("JWT_SECRET"); s != "" {
		return []byte(s)
	}
	return []byte(devJWTSecret)
}

func generateNonce() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func cors(w http.ResponseWriter, r *http.Request) bool {
	w.Header().Set("Access-Control-Allow-Origin", corsOrigin)
	w.Header().Set("Access-Control-Allow-Credentials", "true")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return true
	}
	return false
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// GET /auth/nonce?address=0x...
func handleNonce(w http.ResponseWriter, r *http.Request) {
	if cors(w, r) {
		return
	}
	addr := strings.ToLower(r.URL.Query().Get("address"))
	if addr == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing address"})
		return
	}
	nonce, err := generateNonce()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "nonce generation failed"})
		return
	}
	noncesMu.Lock()
	nonces[addr] = nonceEntry{nonce: nonce, expiresAt: time.Now().Add(nonceTTL)}
	noncesMu.Unlock()
	writeJSON(w, http.StatusOK, map[string]string{"nonce": nonce})
}

// POST /auth/verify  body: { message, signature }
func handleVerify(w http.ResponseWriter, r *http.Request) {
	if cors(w, r) {
		return
	}
	var body struct {
		Message   string `json:"message"`
		Signature string `json:"signature"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid body"})
		return
	}

	msg, err := siwe.ParseMessage(body.Message)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid SIWE message"})
		return
	}

	// siwe-go Verify: validates signature, domain, expiry, nonce
	domain := msg.GetDomain()
	nonce := msg.GetNonce()
	now := time.Now()
	if _, err := msg.Verify(body.Signature, &domain, &nonce, &now); err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "signature invalid"})
		return
	}

	addr := strings.ToLower(msg.GetAddress().Hex())

	noncesMu.Lock()
	entry, ok := nonces[addr]
	if ok {
		delete(nonces, addr)
	}
	noncesMu.Unlock()

	if !ok || time.Now().After(entry.expiresAt) || entry.nonce != nonce {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "nonce expired or invalid"})
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": addr,
		"iat": time.Now().Unix(),
		"exp": time.Now().Add(jwtTTL).Unix(),
	})
	signed, err := token.SignedString(jwtSecret())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "token signing failed"})
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    signed,
		Path:     "/",
		MaxAge:   int(jwtTTL.Seconds()),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
	writeJSON(w, http.StatusOK, map[string]string{"address": addr})
}

// GET /auth/me
func handleMe(w http.ResponseWriter, r *http.Request) {
	if cors(w, r) {
		return
	}
	cookie, err := r.Cookie("session")
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "not authenticated"})
		return
	}
	token, err := jwt.Parse(cookie.Value, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return jwtSecret(), nil
	})
	if err != nil || !token.Valid {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid session"})
		return
	}
	claims := token.Claims.(jwt.MapClaims)
	writeJSON(w, http.StatusOK, map[string]string{"address": claims["sub"].(string)})
}

// POST /auth/logout
func handleLogout(w http.ResponseWriter, r *http.Request) {
	if cors(w, r) {
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
	writeJSON(w, http.StatusOK, map[string]string{"ok": "logged out"})
}

func sweepNonces() {
	for range time.Tick(time.Minute) {
		noncesMu.Lock()
		for addr, e := range nonces {
			if time.Now().After(e.expiresAt) {
				delete(nonces, addr)
			}
		}
		noncesMu.Unlock()
	}
}

func main() {
	go sweepNonces()

	mux := http.NewServeMux()
	mux.HandleFunc("/auth/nonce", handleNonce)
	mux.HandleFunc("/auth/verify", handleVerify)
	mux.HandleFunc("/auth/me", handleMe)
	mux.HandleFunc("/auth/logout", handleLogout)

	log.Printf("listening on %s", port)
	if err := http.ListenAndServe(port, mux); err != nil {
		log.Fatal(err)
	}
}
