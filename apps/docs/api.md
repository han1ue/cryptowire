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

## Local Endpoints

These endpoints are for local operations, not public integrations.

They require `x-refresh-secret` header.

### `POST /news/refresh`

Body fields:

- `limit` (optional, default `30`)
- `force` (optional boolean)
- `sources` (optional, comma-separated source ids; see [References > Sources](/references/sources))

Example:

```sh
curl -X POST "https://api.cryptowi.re/news/refresh" \
  -H "content-type: application/json" \
  -H "x-refresh-secret: YOUR_SECRET" \
  --data-raw '{"limit":30,"force":true,"sources":"coindesk,decrypt,cointelegraph"}'
```

### `POST /news/summary/refresh`

Example:

```sh
curl -X POST "https://api.cryptowi.re/news/summary/refresh" \
  -H "content-type: application/json" \
  -H "x-refresh-secret: YOUR_SECRET" \
  --data-raw '{"hours":24,"limit":180}'
```

### `POST /news/diagnose`

Example:

```sh
curl -X POST "https://api.cryptowi.re/news/diagnose" \
  -H "content-type: application/json" \
  -H "x-refresh-secret: YOUR_SECRET" \
  --data-raw '{"limit":100}'
```
