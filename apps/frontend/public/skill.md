---
name: cryptowire-api
description: |
  cryptowi.re public API for crypto news, summary, prices, and market context.
  Use when users ask for latest crypto headlines, source discovery, recap, quotes, or market overview.
  Do not call restricted admin endpoints unless user explicitly asks and provides x-refresh-secret.
---

# cryptowi.re API instructions for agents

`cryptowi.re` is a real-time crypto news aggregator.

## Base URL

- `https://api.cryptowi.re`

## Default Workflow

1. Call `GET /news/sources` first to fetch valid source ids.
2. If the user does not specify sources, apply the default source policy below.
3. Call `GET /news` with selected `sources`, plus optional `limit`, `cursor`, `category`, and `retentionDays`.
4. If needed, enrich with:
   - `GET /news/summary` for 24h recap
   - `GET /prices` for symbol quotes
   - `GET /market` for market context
5. In user-facing answers, include queried source ids and preserve timestamps.

## Default Source Policy

When the user does not specify sources, use this preferred default set:

- `coindesk`
- `decrypt`
- `cointelegraph`
- `blockworks`

Selection rules:

1. Start from `GET /news/sources`.
2. Pick the preferred defaults that exist in that response, in the order above.
3. If fewer than 3 of the preferred defaults are available, fill remaining slots from `/news/sources` in listed order until you have 4 sources total.
4. Always report which source ids were actually used.

## Quick Reference

| Task | Endpoint | Notes |
|------|----------|-------|
| Discover source ids | `GET /news/sources` | Source of truth for ids. |
| Fetch headlines | `GET /news` | Requires `sources` query param. |
| Fetch recap | `GET /news/summary` | AI summary + highlights + source coverage. |
| Fetch quotes | `GET /prices` | Pass `symbols=BTC,ETH,SOL` style list. |
| Fetch market overview | `GET /market` | Market cap, dominance, volume, fear/greed. |
| Health check | `GET /health` | Service uptime check. |

## Required Behavior

1. `GET /news` requires `sources` (comma-separated source ids).
2. Always query `GET /news/sources` if source ids are unknown or stale.
3. Keep `/news` `limit` in `1-100`.
4. Keep `/news` `retentionDays` in `1-7`.
5. Use `/market` for macro context and `/prices` for per-symbol spot quotes.
6. Do not hardcode the source-id list in prompts or responses.

## Error Handling

- `GET /news/summary` may return `503` when daily summary is not ready; report that and suggest retry later.
- `400` means query/body validation error; correct inputs and retry.
- `401` on restricted endpoints means missing/invalid `x-refresh-secret`.
- `405` on restricted endpoints means wrong method (must use `POST`).

## Restricted Endpoints

Do not call these unless the user explicitly asks and provides `x-refresh-secret`:

- `POST /news/refresh`
- `POST /news/summary/refresh`
- `POST /news/diagnose`

Never use `GET` for refresh endpoints.

Example:

```sh
curl -X POST "https://api.cryptowi.re/news/refresh" \
  -H "content-type: application/json" \
  -H "x-refresh-secret: YOUR_SECRET" \
  --data-raw '{"limit":30,"force":true,"sources":"coindesk,decrypt,cointelegraph"}'
```

## Example Public Calls

```sh
curl "https://api.cryptowi.re/news/sources"
curl "https://api.cryptowi.re/news?sources=coindesk,decrypt,cointelegraph&limit=10"
curl "https://api.cryptowi.re/news/summary"
curl "https://api.cryptowi.re/prices?symbols=BTC,ETH,SOL"
curl "https://api.cryptowi.re/market"
curl "https://api.cryptowi.re/health"
```
