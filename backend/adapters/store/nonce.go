package store

import (
	"sync"
	"time"
)

type NonceStore interface {
	Set(address, nonce string, expiresAt time.Time)
	GetAndDelete(address string) (nonce string, expiresAt time.Time, ok bool)
}

type nonceEntry struct {
	nonce     string
	expiresAt time.Time
}

type MemoryNonceStore struct {
	mu     sync.Mutex
	nonces map[string]nonceEntry
}

func NewMemoryNonceStore() *MemoryNonceStore {
	return &MemoryNonceStore{nonces: make(map[string]nonceEntry)}
}

func (s *MemoryNonceStore) Set(address, nonce string, expiresAt time.Time) {
	s.mu.Lock()
	s.nonces[address] = nonceEntry{nonce: nonce, expiresAt: expiresAt}
	s.mu.Unlock()
}

func (s *MemoryNonceStore) GetAndDelete(address string) (string, time.Time, bool) {
	s.mu.Lock()
	e, ok := s.nonces[address]
	if ok {
		delete(s.nonces, address)
	}
	s.mu.Unlock()
	return e.nonce, e.expiresAt, ok
}

func (s *MemoryNonceStore) Sweep() {
	now := time.Now()
	s.mu.Lock()
	for addr, e := range s.nonces {
		if now.After(e.expiresAt) {
			delete(s.nonces, addr)
		}
	}
	s.mu.Unlock()
}
