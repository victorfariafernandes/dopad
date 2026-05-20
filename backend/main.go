// Run: go run main.go (requires Go 1.21+)
package main

import (
	"log"
	"net/http"
	"os"

	httpadapter "zeropad-backend/adapters/http"
	"zeropad-backend/adapters/store"
	"zeropad-backend/middlewares"
	padsvc "zeropad-backend/services/pad"
)

func main() {
	padStore := store.NewMemoryPadStore()
	padHandler := httpadapter.NewPadHandler(padsvc.New(padStore))

	origin := os.Getenv("ALLOW_ORIGIN")
	if origin == "" {
		origin = "http://localhost:3000"
	}

	mux := http.NewServeMux()
	cors := middlewares.CORS(origin)
	writeLimiter := middlewares.NewRateLimit(10)

	padHandler.Register(mux, cors, writeLimiter)

	log.Printf("listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", mux))
}
