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

## Response handling

When summarizing results for users:

- Include source names and links when available.
- Preserve timestamps from API data.
- State which source ids were queried.
