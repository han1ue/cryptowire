# API

Base URLs:

- Production: `https://api.cryptowi.re`
- Local: `http://localhost:3001`

## Quick Start

Get headlines from selected sources:

```sh
curl "https://api.cryptowi.re/news?sources=coindesk,decrypt,cointelegraph&limit=20"
```

Use source ids from [References > Sources](/references/sources).

## Public Endpoints

### `GET /news`

Returns normalized news items.

Query params:

- `sources` (required, comma-separated source ids; see [References > Sources](/references/sources))
- `limit` (default `30`, max effective `100`)
- `cursor` (optional, use the last item `id` from the previous page)
- `retentionDays` (max effective `7`)
- `category` (optional category filter)

Example:

```sh
curl "https://api.cryptowi.re/news?sources=coindesk,decrypt,cointelegraph&limit=20"
```

Cursor pagination example:

```sh
# Page 1
curl "https://api.cryptowi.re/news?sources=coindesk&category=Markets&limit=20"

# Page 2 (set cursor to the last item id from page 1)
curl "https://api.cryptowi.re/news?sources=coindesk&category=Markets&limit=20&cursor=coindesk-20260227-001"
```

Notes:

- `cursor` should be the last returned item id from the same query shape.
- Keep `sources`, `category`, and `retentionDays` the same between pages when using `cursor` to avoid skips and duplicates.
- Missing `sources` returns `400`.
- Any invalid source id in `sources` returns `400` (for example `coindesk,bad-source`).

Status codes:

- `200` success
- `400` invalid or missing query params (including invalid source ids)

Example response:

```json
{
  "items": [
    {
      "id": "coindesk-20260227-001",
      "title": "Bitcoin ETFs See Fresh Inflows as Volatility Cools",
      "summary": "Analysts point to steady institutional demand as crypto markets stabilize.",
      "url": "https://www.coindesk.com/example-article",
      "source": "CoinDesk",
      "categories": ["Markets"],
      "publishedAt": "2026-02-27T19:20:00.000Z",
      "imageUrl": "https://cdn.example.com/image.jpg"
    }
  ]
}
```

### `GET /news/sources`

Returns all supported source ids and names. Use this first to build your `sources` query.

Example:

```sh
curl "https://api.cryptowi.re/news/sources"
```

Example response:

```json
{
  "sources": [
    { "id": "coindesk", "name": "CoinDesk" },
    { "id": "decrypt", "name": "Decrypt" },
    { "id": "cointelegraph", "name": "Cointelegraph" }
  ]
}
```

Status codes:

- `200` success

### `GET /news/categories`

Returns available categories for selected sources.

Query params:

- `sources` (optional, comma-separated source ids; see [References > Sources](/references/sources))

Example:

```sh
curl "https://api.cryptowi.re/news/categories?sources=coindesk,decrypt"
```

Example response:

```json
{
  "categories": ["Markets", "Policy", "Technology"]
}
```

Status codes:

- `200` success
- `400` invalid query params

### `GET /news/status`

Returns refresh status metadata.

Example:

```sh
curl "https://api.cryptowi.re/news/status"
```

Example response:

```json
{
  "lastRefreshAt": "2026-02-27T19:20:00.000Z",
  "now": "2026-02-27T19:25:00.000Z"
}
```

Status codes:

- `200` success

### `GET /news/item/:id`

Returns one normalized news item by id.

Example:

```sh
curl "https://api.cryptowi.re/news/item/coindesk-20260227-001"
```

Status codes:

- `200` success
- `400` invalid path param
- `404` item not found

### `GET /news/summary`

Returns the latest generated summary of recent headlines.

Example:

```sh
curl "https://api.cryptowi.re/news/summary"
```

Example response:

```json
{
  "generatedAt": "2026-02-27T19:00:00.000Z",
  "windowStart": "2026-02-26T19:00:00.000Z",
  "windowEnd": "2026-02-27T19:00:00.000Z",
  "windowHours": 24,
  "articleCount": 180,
  "model": "unknown-model",
  "aiError": null,
  "summary": "Crypto markets were mixed over the last 24 hours, with Bitcoin holding key levels while altcoins diverged.",
  "highlights": [
    {
      "title": "ETF flows improve",
      "detail": "US spot Bitcoin ETFs posted net inflows after two muted sessions.",
      "sources": ["CoinDesk", "Decrypt"],
      "url": "https://www.coindesk.com/example-article"
    }
  ],
  "sourceCoverage": [
    {
      "sourceId": "coindesk",
      "source": "CoinDesk",
      "articleCount": 25,
      "reputationWeight": 0.95
    }
  ]
}
```

Status codes:

- `200` success
- `503` summary not available yet (typically before first refresh in production)

### `GET /prices`

Returns quotes for requested symbols.

Query params:

- `symbols` (comma-separated, example `BTC,ETH,SOL`)

Example:

```sh
curl "https://api.cryptowi.re/prices?symbols=BTC,ETH,SOL"
```

Example response:

```json
{
  "quotes": [
    {
      "symbol": "BTC",
      "usd": 86123.45,
      "usd24hChange": 2.1,
      "fetchedAt": "2026-02-27T19:20:00.000Z"
    },
    {
      "symbol": "ETH",
      "usd": 4620.17,
      "usd24hChange": 1.4,
      "fetchedAt": "2026-02-27T19:20:00.000Z"
    }
  ]
}
```

Status codes:

- `200` success
- `400` invalid query params

### `GET /market`

Returns market overview stats.

Example:

```sh
curl "https://api.cryptowi.re/market"
```

Example response:

```json
{
  "ok": true,
  "overview": {
    "marketCapUsd": 3123456789012,
    "marketCapChange24hPct": 1.4,
    "volume24hUsd": 154321098765,
    "btcDominancePct": 52.3,
    "updatedAt": 1740684000,
    "fearGreed": {
      "value": 71,
      "classification": "Greed",
      "timestamp": 1740684000
    }
  }
}
```

Status codes:

- `200` success
- `502` upstream service unavailable

### `GET /health`

Health check endpoint.

Example:

```sh
curl "https://api.cryptowi.re/health"
```

Example response:

```json
{ "ok": true }
```

Status codes:

- `200` success

### `GET /rss.xml`

RSS feed of latest headlines.

Example:

```sh
curl "https://api.cryptowi.re/rss.xml"
```

Status codes:

- `200` success

## Admin Endpoints

These endpoints are for refresh and diagnostics workflows.

Authorization:

- In production, send `x-refresh-secret` and match `NEWS_REFRESH_SECRET`.
- In non-production, if `NEWS_REFRESH_SECRET` is unset, these endpoints are allowed without that header.

### `POST /news/refresh`

Body fields:

- `limit` (optional, default `30`, max effective `100`)
- `retentionDays` (optional, max effective `7`)
- `sources` (optional, comma-separated source ids; see [References > Sources](/references/sources))
- `force` (optional boolean: `true`/`false`/`1`/`0`)

Notes:

- If `sources` is omitted, or none of the supplied ids are valid, all supported sources are fetched.

Example:

```sh
curl -X POST "https://api.cryptowi.re/news/refresh" \
  -H "content-type: application/json" \
  -H "x-refresh-secret: YOUR_SECRET" \
  --data-raw '{"limit":30,"retentionDays":7,"force":true,"sources":"coindesk,decrypt,cointelegraph"}'
```

Status codes:

- `200` success
- `400` invalid body
- `401` unauthorized
- `405` wrong method (`GET /news/refresh`)

### `POST /news/summary/refresh`

Body fields:

- `hours` (optional, default `24`, max `72`)
- `limit` (optional, default `180`, max effective `250`)
- `sources` (optional, comma-separated source ids; see [References > Sources](/references/sources))
- `force` (optional boolean: `true`/`false`/`1`/`0`)

Notes:

- If `sources` is omitted, or none of the supplied ids are valid, all supported sources are used.
- Returns `{ "ok": true, "skipped": true, ... }` when a fresh summary already exists and `force` is not set.

Example:

```sh
curl -X POST "https://api.cryptowi.re/news/summary/refresh" \
  -H "content-type: application/json" \
  -H "x-refresh-secret: YOUR_SECRET" \
  --data-raw '{"hours":24,"limit":180,"sources":"coindesk,decrypt"}'
```

Status codes:

- `200` success
- `400` invalid body
- `401` unauthorized
- `405` wrong method (`GET /news/summary/refresh`)

### `POST /news/diagnose`

Body fields:

- `limit` (optional, default `5`, max `200`)
- `sources` (optional, comma-separated source ids forwarded to upstream probe)

Example:

```sh
curl -X POST "https://api.cryptowi.re/news/diagnose" \
  -H "content-type: application/json" \
  -H "x-refresh-secret: YOUR_SECRET" \
  --data-raw '{"limit":100,"sources":"coindesk,decrypt"}'
```

Status codes:

- `200` success
- `400` invalid body
- `401` unauthorized
- `405` wrong method (`GET /news/diagnose`)
