FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=arm64 \
    go build -ldflags="-w -s" -o dopad-backend .

FROM gcr.io/distroless/static-debian12
COPY --from=builder /app/dopad-backend /dopad-backend
EXPOSE 8080
ENTRYPOINT ["/dopad-backend"]
