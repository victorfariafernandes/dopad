# dopad — REST API Specification

## Base URL

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:8080` |
| Production | `https://api.dopad.io` |

## General Conventions

- All responses: `Content-Type: application/json`
- Auth: `Authorization: Bearer <jwt>` header for protected routes
- Errors always return `{ "error": "<message>" }`
- CORS: allowed origin `http://localhost:3000`, methods `GET POST PUT DELETE OPTIONS`, header `Content-Type Authorization`

---

## Endpoints

### `GET /auth/nonce`

Returns a one-time nonce for a given Ethereum address. Nonce expires after 5 minutes.

**Query params:**
- `address` (string, required) — Ethereum address

**Response 200:**
```json
{ "nonce": "a3f8c2..." }
```

**Response 400:**
```json
{ "error": "missing address" }
```

---

### `POST /auth/verify`

Verifies a SIWE signature and issues a JWT (24-hour TTL).

**Body:**
```json
{
  "message": "<SIWE message string>",
  "signature": "<hex-encoded signature>"
}
```

**Response 200:**
```json
{ "address": "0xabc123...", "token": "<jwt>" }
```

**Response 400:**
```json
{ "error": "invalid body" }
{ "error": "invalid SIWE message" }
```

**Response 401:**
```json
{ "error": "signature invalid" }
{ "error": "nonce expired or invalid" }
```

---

### `GET /auth/me`

Validates the current JWT and returns the authenticated address.

**Headers:** `Authorization: Bearer <jwt>`

**Response 200:**
```json
{ "address": "0xabc123..." }
```

**Response 401:**
```json
{ "error": "not authenticated" }
{ "error": "invalid session" }
```

---

### `POST /auth/logout`

Client-side logout. Server is stateless; the client must discard the JWT.

**Response 200:**
```json
{ "ok": "logged out" }
```
