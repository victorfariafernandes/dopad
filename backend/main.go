// Run: go run main.go (requires Go 1.21+)
// Env: JWT_SECRET (optional, defaults to insecure dev value)
package main

import (
	"log"
	"net/http"
	"os"
	"time"

	httpadapter "no-trust-cms-backend/adapters/http"
	"no-trust-cms-backend/adapters/store"
	"no-trust-cms-backend/middlewares"
	authsvc "no-trust-cms-backend/services/auth"
)

func main() {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "dev-secret-change-in-production"
	}

	nonceStore := store.NewMemoryNonceStore()
	go func() {
		for range time.Tick(time.Minute) {
			nonceStore.Sweep()
		}
	}()

	svc := authsvc.New(nonceStore, []byte(secret), 5*time.Minute, 24*time.Hour)

	handler := httpadapter.NewAuthHandler(svc)
	mux := http.NewServeMux()
	handler.Register(mux, middlewares.CORS("http://localhost:3000"))

	log.Printf("listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", mux))
}
