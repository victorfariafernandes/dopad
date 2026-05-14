# dopad — REST API Specification

## Base URL

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:8080` |
| Production | `https://api.dopad.io` |

## General Conventions

- All responses: `Content-Type: application/json`
- Errors always return `{ "error": "<message>" }`
- CORS: allowed origin `http://localhost:3000`, methods `GET PUT OPTIONS`, header `Content-Type`

---

## Endpoints

### `GET /pads/{slug}`

Returns the content of a pad by slug.

**Response 200:**
```json
{ "slug": "my-page", "content": "hello world", "encrypted": false, "verify_blob": "" }
```

**Response 400:**
```json
{ "error": "missing slug" }
```

**Response 404:**
```json
{ "error": "pad not found" }
```

---

### `PUT /pads/{slug}`

Creates or overwrites a pad. Rate-limited to **10 requests/minute per IP**.

**Body:**
```json
{ "content": "hello world", "encrypted": false, "verify_blob": "" }
```

For encrypted pads:
```json
{
  "content": "<base64(iv || ciphertext)>",
  "encrypted": true,
  "verify_blob": "<base64(salt || iv || ciphertext)>"
}
```

**Response 200:**
```json
{ "slug": "my-page", "content": "...", "encrypted": true, "verify_blob": "..." }
```

**Response 400:**
```json
{ "error": "missing slug" }
{ "error": "invalid body" }
```

**Response 429:**
```json
{ "error": "rate limit exceeded" }
```
