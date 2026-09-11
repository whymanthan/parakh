# API SPECIFICATION

This specification is based only on the server implementation in server.js and the browser calls in the front-end.

## 1. Base URL

The current server runs locally on:

- http://localhost:3001

## 2. Environment configuration

Required environment variables:

- PORT: server port, default 3001
- GEMINI_API_KEY: API key for Google Gemini
- GEMINI_MODEL: model name, default gemini-2.5-flash
- CORS_ORIGIN: expected origin for CORS, although the server currently allows origin: true

## 3. Endpoints

### GET /health

Purpose:
- server health check

Request:
- no parameters

Success response:

```json
{
  "ok": true,
  "status": "ready"
}
```

Failure behavior:
- none in current code; endpoint always returns success if server is up

### GET /api/fetch-product-page

Purpose:
- fetch text from an external product page for downstream extraction

Request:

```http
GET /api/fetch-product-page?url=https://example.com/product
```

Parameters:
- url: required

Behavior:
- normalizes the URL
- attempts fetch via multiple candidate URLs, including r.jina.ai fallback and direct URL
- strips scripts, styles, and HTML tags
- returns readable text

Success response:

```json
{
  "ok": true,
  "text": "cleaned product page text",
  "sourceUrl": "https://example.com/product"
}
```

Error response:

```json
{
  "ok": false,
  "error": "Unable to fetch product page content.",
  "message": "No readable product page content was returned.",
  "sourceUrl": "https://example.com/product"
}
```

Notes:
- this endpoint is not authenticated
- it can be abused to fetch arbitrary URLs from the server
- it does not cache results

### POST /api/extract-product

Purpose:
- convert raw product text into structured declaration fields using Gemini

Request body:

```json
{
  "rawText": "Net Quantity: 500 g\nMRP: Rs 120\nManufacturer: ABC Foods",
  "sourceUrl": "https://www.amazon.in/example",
  "sourceType": "ocr"
}
```

Accepted values:
- rawText: string
- sourceUrl: optional string
- sourceType: optional string

Behavior:
- reads GEMINI_API_KEY and GEMINI_MODEL
- detects retailer from source URL
- builds a JSON-only prompt
- calls Google Gemini generateContent API
- decodes the response candidate into JSON
- returns structured product fields

Success response:

```json
{
  "ok": true,
  "product": {
    "productName": "",
    "brand": "",
    "manufacturer": "",
    "netQtyValue": "500",
    "netQtyUnit": "g",
    "mrp": "120",
    "mfgDate": "",
    "consumerCare": "",
    "countryOfOrigin": "",
    "imported": false,
    "rawText": "Net Quantity: 500 g\nMRP: Rs 120\nManufacturer: ABC Foods"
  }
}
```

Failure response:

```json
{
  "error": "Missing GEMINI_API_KEY in environment."
}
```

or

```json
{
  "error": "Gemini API request failed",
  "details": {}
}
```

## 4. Client-side API usage in the current app

The browser calls the backend in two places:

- js/features/scan/scan.js
  - fetch('http://localhost:3001/api/extract-product', { method: 'POST' ... })
  - fetch('http://localhost:3001/api/fetch-product-page?url=...')

This is a hardcoded local development assumption and is not environment-aware beyond localhost.

## 5. Data contracts

### Product extraction contract

The app expects the following output from Gemini:

```json
{
  "productName": "",
  "brand": "",
  "manufacturer": "",
  "netQtyValue": "",
  "netQtyUnit": "",
  "mrp": "",
  "mfgDate": "",
  "consumerCare": "",
  "countryOfOrigin": "",
  "imported": false,
  "rawText": ""
}
```

### External page fetch contract

```json
{
  "ok": true,
  "text": "...",
  "sourceUrl": "..."
}
```

## 6. Notes on backend completeness

The current backend does not provide:

- authentication
- user management
- inspection CRUD with ownership
- database storage
- role enforcement
- audit trail
- bulk operations
- pagination
- search endpoints for historical inspections
- export endpoints beyond browser-side CSV/print
- any server-side schema validation layer

## 7. API security observations

Current concerns:

- auth enforcement is partially implemented and not yet production-grade
- CORS is permissive
- external URL fetch is open to arbitrary server access
- no rate limiting or abuse prevention
- no canonical API versioning

## 8. Corrected documentation issues

The following documentation issues were corrected during the audit:

- added the real login/register/auth routes to the documented endpoint set
- documented the active JWT auth flow and the admin-only delete role
- clarified that inspections are stored in a file-backed JSON store, not a production database
- clarified that optional auth middleware is a compatibility layer, not a full production permission model
- removed any assumption that the app is entirely unauthenticated or entirely local-only

## 9. Verified Against Code

Verified against the implementation in server.js, auth.js, js/utils/storage.js, and the browser client logic:

- Existing routes: /, /health, /login, /api/auth/register, /api/auth/login, /api/me, /api/inspections, /api/inspections/:id, /api/fetch-product-page, /api/extract-product
- Auth behavior: JWTs are issued on login, bearer tokens are validated, and role checks reject unauthorized requests
- Inspection persistence: file-system JSON storage is real and active, with localStorage retained as a fallback
- Product extraction: Gemini and URL fetch flows are real, not mocked
- Important distinction: this is not a production multi-user backend; the current auth layer and storage are still minimal and local-to-process
- No mock backend feature was documented as real; all claims above are based on code execution and server behavior

## 8. Corrected status from code audit

The following items were corrected from earlier drafts:

- a real login/auth flow exists in server.js and auth.js
- /api/auth/register and /api/auth/login are active routes
- /api/me has been added for token-based identification
- inspection and extraction routes are not fully protected in production; the current code uses an optional auth middleware for compatibility while the app is still transitioning
- server-side persistence is file-based JSON, not a real database

## 9. Verified Against Code

Verified against the implementation in server.js and auth.js:

- Routes implemented: /, /health, /login, /api/auth/register, /api/auth/login, /api/me, /api/inspections, /api/inspections/:id, /api/fetch-product-page, /api/extract-product
- Auth behavior: login creates a JWT using process.env.JWT_SECRET or the dev fallback; authMiddleware validates bearer tokens; requireRole blocks unauthorized access; admin-only delete is enforced on /api/inspections
- Data behavior: inspections are stored in data/inspections.json through the file system; user accounts are in-memory in AUTH_STORE and reset on server restart
- Important caveat: the app still treats auth as a compatibility layer for legacy browser behavior; it is not yet a complete production identity system
- Not a real backend feature: the app does not use a relational database, user ownership model, or audit trail despite the auth scaffolding being present
- no per-user resource isolation

## 8. Android compatibility status

As currently implemented, the API layer is too limited and too development-specific to support a production Android client without additional work.
