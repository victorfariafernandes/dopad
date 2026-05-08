package auth

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	siwe "github.com/spruceid/siwe-go"

	"no-trust-cms-backend/adapters/store"
)

var (
	ErrInvalidSIWEMessage = errors.New("invalid SIWE message")
	ErrSignatureInvalid   = errors.New("signature invalid")
	ErrNonceExpired       = errors.New("nonce expired or invalid")
)

type Service struct {
	nonces    store.NonceStore
	jwtSecret []byte
	nonceTTL  time.Duration
	jwtTTL    time.Duration
}

func New(nonces store.NonceStore, jwtSecret []byte, nonceTTL, jwtTTL time.Duration) *Service {
	return &Service{
		nonces:    nonces,
		jwtSecret: jwtSecret,
		nonceTTL:  nonceTTL,
		jwtTTL:    jwtTTL,
	}
}

func (s *Service) GenerateNonce(address string) (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate nonce: %w", err)
	}
	nonce := hex.EncodeToString(b)
	s.nonces.Set(strings.ToLower(address), nonce, time.Now().Add(s.nonceTTL))
	return nonce, nil
}

func (s *Service) VerifyAndIssueToken(message, signature string) (address, token string, err error) {
	msg, err := siwe.ParseMessage(message)
	if err != nil {
		return "", "", ErrInvalidSIWEMessage
	}

	domain := msg.GetDomain()
	nonce := msg.GetNonce()
	now := time.Now()
	if _, err := msg.Verify(signature, &domain, &nonce, &now); err != nil {
		return "", "", ErrSignatureInvalid
	}

	address = strings.ToLower(msg.GetAddress().Hex())
	storedNonce, expiresAt, ok := s.nonces.GetAndDelete(address)
	if !ok || time.Now().After(expiresAt) || storedNonce != nonce {
		return "", "", ErrNonceExpired
	}

	t := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": address,
		"iat": time.Now().Unix(),
		"exp": time.Now().Add(s.jwtTTL).Unix(),
	})
	signed, err := t.SignedString(s.jwtSecret)
	if err != nil {
		return "", "", fmt.Errorf("sign token: %w", err)
	}

	return address, signed, nil
}

func (s *Service) ValidateToken(tokenStr string) (string, error) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return s.jwtSecret, nil
	})
	if err != nil || !token.Valid {
		return "", fmt.Errorf("invalid session")
	}
	claims := token.Claims.(jwt.MapClaims)
	return claims["sub"].(string), nil
}
