# API

Base URLs:

- Production: `https://api.cryptowi.re`
- Local: `http://localhost:3001`

## Quick Start

Get headlines from selected sources:

```sh
curl "https://api.cryptowi.re/news?sources=coindesk,decrypt,cointelegraph&limit=20"
```

Use source ids from [References](/references#sources).

## Public Endpoints

### `GET /news`

Returns normalized news items.

Query params:

- `sources` (required, comma-separated source ids; see [References](/references#sources))
- `limit` (default `30`, max effective `100`)
- `offset` (default `0`)
- `retentionDays` (max effective `7`)
- `category` (optional category filter)

Example:

```sh
curl "https://api.cryptowi.re/news?sources=coindesk,decrypt,cointelegraph&limit=20&offset=0"
```

### `GET /news/sources`

Returns all supported source ids and names. Use this first to build your `sources` query.

Example:

```sh
curl "https://api.cryptowi.re/news/sources"
```

### `GET /news/summary`

Returns the latest generated summary of recent headlines.

Example:

```sh
curl "https://api.cryptowi.re/news/summary"
```

### `GET /prices`

Returns quotes for requested symbols.

Query params:

- `symbols` (comma-separated, example `BTC,ETH,SOL`)

Example:

```sh
curl "https://api.cryptowi.re/prices?symbols=BTC,ETH,SOL"
```

### `GET /market`

Returns market overview stats.

Example:

```sh
curl "https://api.cryptowi.re/market"
```

### `GET /health`

Health check endpoint.

Example:

```sh
curl "https://api.cryptowi.re/health"
```

## Local Endpoints

These endpoints are for local operations, not public integrations.

They require `x-refresh-secret` header.

### `POST /news/refresh`

Body fields:

- `limit` (optional, default `30`)
- `force` (optional boolean)
- `sources` (optional, comma-separated source ids; see [References](/references#sources))

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
