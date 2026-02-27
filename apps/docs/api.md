# API Endpoints

Base URL examples:

- Local: `http://localhost:3001`
- Production: `https://api.cryptowi.re`

## Public Endpoints

### `GET /health`
Returns service health.

### `GET /news`
Query params:

- `limit` (max effective 100)
- `offset`
- `retentionDays`
- `sources` (comma-separated source ids)
- `category`

### `GET /news/summary`
Returns the latest generated AI summary.

### `GET /news/sources`
Returns supported news sources.

### `GET /prices`
Query params:

- `symbols` (comma-separated, e.g. `BTC,ETH,SOL`)

### `GET /market`
Returns market overview metrics.

## Admin Endpoints

Admin endpoints require `x-refresh-secret` header and should be called with `POST`.

### `POST /news/refresh`
Refresh and persist latest news items.

```sh
curl -X POST "https://api.cryptowi.re/news/refresh" \
  -H "content-type: application/json" \
  -H "x-refresh-secret: YOUR_SECRET" \
  --data-raw '{"limit":30,"force":true,"sources":"coindesk,decrypt,cointelegraph"}'
```

### `POST /news/summary/refresh`
Generate and store AI summary.

```sh
curl -X POST "https://api.cryptowi.re/news/summary/refresh" \
  -H "content-type: application/json" \
  -H "x-refresh-secret: YOUR_SECRET" \
  --data-raw '{"hours":24,"limit":180}'
```

### `POST /news/diagnose`
Debug upstream provider responses.

```sh
curl -X POST "https://api.cryptowi.re/news/diagnose" \
  -H "content-type: application/json" \
  -H "x-refresh-secret: YOUR_SECRET" \
  --data-raw '{"limit":100}'
```

## Notes

- Vercel cron traffic can still hit refresh endpoints with `GET` when Vercel sends `x-vercel-cron: 1`.
- Manual/admin use should always be `POST` + header auth.
