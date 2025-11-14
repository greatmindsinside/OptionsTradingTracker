# API Specification

**Version:** 1.0  
**Base URL:** `https://api.example.com/api/v1`  
**Last Updated:** 2025-11-11

---

## Authentication

All endpoints (except auth endpoints) require authentication via JWT token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

### Token Types

- **Access Token:** Short-lived (15 minutes), sent in Authorization header
- **Refresh Token:** Long-lived (7 days), stored in httpOnly cookie

---

## Common Response Formats

### Success Response

```json
{
  "data": { ... },
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 50
  }
}
```

### Error Response

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

### Pagination

- **Query Parameters:** `?page=1&limit=50`
- **Default Limit:** 50
- **Max Limit:** 100

---

## Authentication Endpoints

### Register User

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "subscriptionTier": "free"
    },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:** Same as register

### Refresh Token

```http
POST /api/v1/auth/refresh
```

**Response:**

```json
{
  "data": {
    "accessToken": "new_jwt_token"
  }
}
```

### Logout

```http
POST /api/v1/auth/logout
```

**Response:**

```json
{
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

## Journal Endpoints

### List Journal Entries

```http
GET /api/v1/journal?page=1&limit=50&symbol=AAPL&type=sell_to_open&from=2025-01-01&to=2025-12-31
Authorization: Bearer <token>
```

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50, max: 100)
- `symbol` (optional): Filter by symbol
- `type` (optional): Filter by transaction type
- `from` (optional): Start date (ISO format)
- `to` (optional): End date (ISO format)
- `status` (optional): `all`, `open`, `closed`, `deleted`

**Response:**

```json
{
  "data": [
    {
      "id": "entry_id",
      "ts": "2025-11-11T10:00:00Z",
      "accountId": "acct-1",
      "symbol": "AAPL",
      "type": "sell_to_open",
      "qty": 10,
      "amount": 2500.0,
      "strike": 150,
      "expiration": "2025-12-15",
      "underlyingPrice": null,
      "notes": "Sell 10 AAPL $150 Puts",
      "meta": null,
      "deletedAt": null,
      "createdAt": "2025-11-11T10:00:00Z",
      "updatedAt": "2025-11-11T10:00:00Z"
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 50
  }
}
```

### Create Journal Entry

```http
POST /api/v1/journal
Authorization: Bearer <token>
Content-Type: application/json

{
  "ts": "2025-11-11T10:00:00Z",
  "accountId": "acct-1",
  "symbol": "AAPL",
  "type": "sell_to_open",
  "qty": 10,
  "amount": 2500.0,
  "strike": 150,
  "expiration": "2025-12-15",
  "underlyingPrice": null,
  "notes": "Sell 10 AAPL $150 Puts",
  "meta": null
}
```

**Response:**

```json
{
  "data": {
    "id": "entry_id",
    ... // full entry object
  }
}
```

### Update Journal Entry

```http
PUT /api/v1/journal/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 2600.0,
  "notes": "Updated notes",
  "editReason": "Correction: premium was $2.60, not $2.50"
}
```

**Response:**

```json
{
  "data": {
    "id": "entry_id",
    ... // updated entry object
  }
}
```

### Delete Journal Entry

```http
DELETE /api/v1/journal/:id
Authorization: Bearer <token>
```

**Response:**

```json
{
  "data": {
    "id": "entry_id",
    "deletedAt": "2025-11-11T10:00:00Z"
  }
}
```

---

## Trades Endpoints

### List Trades

```http
GET /api/v1/trades?symbol=AAPL&type=sell_to_open
Authorization: Bearer <token>
```

**Note:** Alias for `GET /api/v1/journal` with type filter

### Create Trade

```http
POST /api/v1/trades
Authorization: Bearer <token>
Content-Type: application/json

{
  "template": "tmplSellPut",
  "data": {
    "accountId": "acct-1",
    "symbol": "AAPL",
    "date": "2025-11-11",
    "contracts": 10,
    "premiumPerContract": 2.5,
    "strike": 150,
    "expiration": "2025-12-15",
    "fee": 7.0
  }
}
```

**Response:**

```json
{
  "data": {
    "entries": [
      { ... }, // sell_to_open entry
      { ... }  // fee entry
    ]
  }
}
```

---

## Wheel Endpoints

### Get Wheel Data

```http
GET /api/v1/wheel
Authorization: Bearer <token>
```

**Response:**

```json
{
  "data": {
    "positions": [
      {
        "id": "position_id",
        "ticker": "AAPL",
        "strike": 150,
        "qty": 10,
        "entry": 2.5,
        "mark": 2.3,
        "dte": 29,
        "m": 0.95,
        "type": "P",
        "side": "S"
      }
    ],
    "shareLots": [
      {
        "ticker": "AAPL",
        "qty": 1000,
        "costPerShare": 150.0
      }
    ],
    "alerts": [ ... ],
    "metrics": {
      "premiumThisWeek": 2500.0,
      "capitalInPuts": 150000.0,
      "sharesForCalls": 1000
    },
    "tickers": ["AAPL", "TSLA"]
  }
}
```

---

## Import Endpoints

### Import CSV

```http
POST /api/v1/import/csv
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <csv_file>
```

**Response:**

```json
{
  "data": {
    "importId": "import_123",
    "totalRecords": 100,
    "successfulRecords": 95,
    "failedRecords": 3,
    "skippedRecords": 2,
    "errors": [
      {
        "recordIndex": 45,
        "error": "Missing expiration date",
        "code": "MISSING_FIELD"
      }
    ]
  }
}
```

---

## Error Codes

### Authentication Errors

- `AUTH_REQUIRED` - Authentication required
- `AUTH_INVALID` - Invalid token
- `AUTH_EXPIRED` - Token expired
- `AUTH_INVALID_CREDENTIALS` - Invalid email/password
- `AUTH_EMAIL_EXISTS` - Email already registered

### Validation Errors

- `VALIDATION_ERROR` - Input validation failed
- `MISSING_FIELD` - Required field missing
- `INVALID_FORMAT` - Invalid data format

### Resource Errors

- `NOT_FOUND` - Resource not found
- `FORBIDDEN` - Access denied
- `CONFLICT` - Resource conflict

### Server Errors

- `INTERNAL_ERROR` - Internal server error
- `DATABASE_ERROR` - Database operation failed
- `SERVICE_UNAVAILABLE` - Service temporarily unavailable

---

## Rate Limiting

- **Auth endpoints:** 5 requests per minute
- **Other endpoints:** 100 requests per minute
- **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Versioning

- **Current Version:** v1
- **Version in URL:** `/api/v1/...`
- **Deprecation:** Deprecated versions will return `Deprecation` header
- **Migration:** See migration guide for version upgrades

---

## References

- **Migration Plan:** `docs/reference/migration-plan.md`
- **Tasks:** `docs/tasks/` - Implementation tasks
- **ADRs:** `docs/decisions/` - Architecture decisions
