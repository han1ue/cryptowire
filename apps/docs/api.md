# API

Base URLs:

- Production: `https://api.cryptowi.re`
- Local: `http://localhost:3001`

## Quick Start

Get headlines from selected sources:

```sh
curl "https://api.cryptowi.re/news?sources=coindesk,decrypt,cointelegraph&limit=20"
```

## Public Endpoints

### `GET /news`

Returns normalized news items.

Query params:

- `sources` (required, comma-separated source ids)
- `limit` (default `30`, max effective `100`)
- `offset` (default `0`)
- `retentionDays` (max effective `7`)
- `category` (optional category filter)

### `GET /news/sources`

Returns all supported source ids and names. Use this first to build your `sources` query.

### `GET /news/summary`

Returns the latest generated summary of recent headlines.

### `GET /prices`

Returns quotes for requested symbols.

Query params:

- `symbols` (comma-separated, example `BTC,ETH,SOL`)

### `GET /market`

Returns market overview stats.

### `GET /health`

Health check endpoint.

## Admin Endpoints (Operator Only)

These endpoints are for `cryptowi.re` operators, not public integrations.

- `POST /news/refresh`
- `POST /news/summary/refresh`
- `POST /news/diagnose`

They require `x-refresh-secret` header.
