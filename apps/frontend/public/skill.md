# cryptowi.re API instructions for agents

`cryptowi.re` is a crypto news aggregator.

Use these rules when calling the API:

## Base URL

- `https://api.cryptowi.re`

## Public endpoints

- `GET /news`
- `GET /news/sources`
- `GET /news/summary`
- `GET /prices`
- `GET /market`
- `GET /health`

## Endpoint guide

- `GET /news`
  Use for article retrieval. This is the main feed endpoint and returns normalized headline items.
  Requires `sources`; supports `limit`, `offset`, optional `category`, and optional `retentionDays`.
- `GET /news/sources`
  Use to discover valid source ids before calling `/news`.
  Returns the canonical id/name pairs the API currently supports.
- `GET /news/summary`
  Use when you need a high-level recap of recent activity.
  Returns an AI-generated summary, highlights, and source coverage metadata.
- `GET /prices`
  Use for spot price snapshots on selected symbols.
  Returns quotes with USD price and optional 24h change.
- `GET /market`
  Use for market-wide context instead of per-asset prices.
  Returns market cap, 24h volume, BTC dominance, and fear/greed data.
- `GET /health`
  Use for uptime checks and connectivity tests.
  Returns a minimal service-health response.

## Example calls (curl)

### Get news

```sh
curl "https://api.cryptowi.re/news?sources=coindesk,decrypt,cointelegraph&limit=10&offset=0"
```

Expected format:

```json
{
  "items": [
    {
      "id": "string",
      "title": "string",
      "summary": "string",
      "url": "https://example.com/article",
      "source": "CoinDesk",
      "categories": ["Markets"],
      "publishedAt": "2026-02-27T19:20:00.000Z",
      "imageUrl": "https://example.com/image.jpg"
    }
  ]
}
```

### Get available sources

```sh
curl "https://api.cryptowi.re/news/sources"
```

Expected format:

```json
{
  "sources": [
    { "id": "coindesk", "name": "CoinDesk" },
    { "id": "decrypt", "name": "Decrypt" }
  ]
}
```

### Get AI summary

```sh
curl "https://api.cryptowi.re/news/summary"
```

Expected format:

```json
{
  "generatedAt": "2026-02-27T19:00:00.000Z",
  "windowStart": "2026-02-26T19:00:00.000Z",
  "windowEnd": "2026-02-27T19:00:00.000Z",
  "windowHours": 24,
  "articleCount": 180,
  "model": "unknown-model",
  "aiError": null,
  "summary": "string",
  "highlights": [
    {
      "title": "string",
      "detail": "string",
      "sources": ["CoinDesk", "Decrypt"],
      "url": "https://example.com/article"
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

### Get prices

```sh
curl "https://api.cryptowi.re/prices?symbols=BTC,ETH,SOL"
```

Expected format:

```json
{
  "quotes": [
    {
      "symbol": "BTC",
      "usd": 86123.45,
      "usd24hChange": 2.1,
      "fetchedAt": "2026-02-27T19:20:00.000Z"
    }
  ]
}
```

### Get market overview

```sh
curl "https://api.cryptowi.re/market"
```

Expected format:

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

### Health check

```sh
curl "https://api.cryptowi.re/health"
```

Expected format:

```json
{ "ok": true }
```

## Required behavior

1. `GET /news` requires `sources` (comma-separated source ids). If source ids are unknown, call `GET /news/sources` first.
2. Keep `limit` at `1-100` for `/news`.
3. Keep `retentionDays` at `1-7` for `/news`.
4. For prices, call `/prices?symbols=BTC,ETH,SOL` style queries.
5. For market overview, call `/market`.
6. For latest aggregate summary, call `/news/summary`.

## Source ids

Use `/news/sources` as the source of truth.

Current source ids:

- `coindesk`
- `decrypt`
- `cointelegraph`
- `blockworks`
- `bitcoin.com`
- `cryptopotato`
- `forbes`
- `cryptopolitan`
- `coinpaprika`
- `seekingalpha`
- `bitcoinist`
- `newsbtc`
- `utoday`
- `investing_comcryptonews`
- `ethereumfoundation`
- `bitcoincore`

## Restricted local endpoints

Do not call these unless the user explicitly asks and provides `x-refresh-secret`:

- `POST /news/refresh`
- `POST /news/summary/refresh`
- `POST /news/diagnose`

Local endpoint example:

```sh
curl -X POST "https://api.cryptowi.re/news/refresh" \
  -H "content-type: application/json" \
  -H "x-refresh-secret: YOUR_SECRET" \
  --data-raw '{"limit":30,"force":true,"sources":"coindesk,decrypt,cointelegraph"}'
```

Expected format:

```json
{
  "ok": true,
  "count": 30,
  "limit": 30,
  "retentionDays": 7,
  "force": true,
  "refreshedAt": "2026-02-27T19:20:00.000Z",
  "note": null
}
```

## Response handling

When summarizing results for users:

- Include source names and links when available.
- Preserve timestamps from API data.
- State which source ids were queried.
