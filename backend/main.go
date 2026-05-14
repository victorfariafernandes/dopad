// Run: go run main.go (requires Go 1.21+)
package main

import (
	"log"
	"net/http"

	httpadapter "no-trust-cms-backend/adapters/http"
	"no-trust-cms-backend/adapters/store"
	"no-trust-cms-backend/middlewares"
	padsvc "no-trust-cms-backend/services/pad"
)

func main() {
	padStore := store.NewMemoryPadStore()
	padHandler := httpadapter.NewPadHandler(padsvc.New(padStore))

	mux := http.NewServeMux()
	cors := middlewares.CORS("http://localhost:3000")
	writeLimiter := middlewares.NewRateLimit(10)

	padHandler.Register(mux, cors, writeLimiter)

	log.Printf("listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", mux))
}
