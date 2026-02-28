
# CryptoWire

CryptoWire is a modern crypto news dashboard built with React, TypeScript, and Tailwind CSS.

This repo is a single-repo setup with:

- `apps/frontend` – Vite + React UI
- `apps/api` – Express + TypeScript API (can deploy to Vercel)
- `apps/docs` – VitePress docs site
- `packages/types` – shared DTOs/zod schemas
- `packages/adapters` – provider adapters (CoinDesk news, CoinGecko prices)
- `packages/widget` – embeddable widget package (`@cryptowire/widget`)

## Getting Started

1. Install dependencies:
	```sh
	npm install
	```
2. Start both frontend + API:
	```sh
	npm run dev
	```
3. Start docs:
	```sh
	npm run dev:docs
	```

Local URLs:

- Frontend: `http://localhost:8080`
- API: `http://localhost:3001/health`
- Docs: `http://localhost:5173`

Environment:

- Set `SITE_URL` (required in production) to your public site origin, e.g. `https://cryptowi.re`
- Set `COINDESK_API_KEY` to enable live news
- News retention defaults to 7 days via `NEWS_RETENTION_DAYS`
- Set `CORS_ORIGIN` (comma-separated) to restrict API CORS origins in production
- Set `GEMINI_API_KEY` to enable AI summary generation with Gemini
- Optional: set `GEMINI_MODEL` (default: `gemini-2.0-flash`)
- Optional fallback: set `OPENAI_API_KEY` (and `OPENAI_MODEL`) if you prefer OpenAI
- Set `VITE_GA_ID` in frontend env to enable Google Analytics in production builds

Quality checks:

- `npm run lint`
- `npm run build`

## Features
- Real-time crypto news
- Saved articles
- Category filtering
- Responsive terminal-inspired UI
- Embeddable widget at `/widget` with loader script `/widget/widget.js`
- npm package: `@cryptowire/widget`

## API

- `GET /news?limit=30&retentionDays=7`
- `GET /news/summary` (returns last generated summary from file/cache)
- `POST /news/refresh` (admin; send `x-refresh-secret` header)
- `POST /news/summary/refresh` (admin; send `x-refresh-secret` header)
- `GET /prices?symbols=BTC,ETH,SOL`

## Widget Package

- Source of truth: `packages/widget`
- Hosted loader used by websites: `apps/frontend/public/widget/widget.js`
- Rebuild/sync command: `npm run build -w @cryptowire/widget`
- CI enforces sync between package source and hosted loader

Publish process:
1. Bump version in `packages/widget/package.json`
2. Commit + push to `main`
3. Workflow `Publish Widget Package` auto-runs and publishes when the new version is not yet on npm (requires `NPM_TOKEN` secret)
4. Optional fallback: run the workflow manually from GitHub Actions (`workflow_dispatch`)

## Vercel deploy (one repo, three projects)

Create three Vercel projects pointing at the same Git repo:

- Frontend project Root Directory: `apps/frontend`
- API project Root Directory: `apps/api`
- Docs project Root Directory: `apps/docs`

Set the API project env vars from `.env`.

### Scheduled refresh (Hobby-friendly)

Vercel Hobby cron jobs are limited; this repo uses GitHub Actions to periodically hit the refresh endpoint so users aren’t triggering upstream CoinDesk fetches.

- Configure the API env var `NEWS_REFRESH_SECRET` (any random string)
- Add GitHub repo secrets:
	- `CRYPTOWIRE_API_BASE_URL` = your API deployment root URL (no trailing slash), e.g. `https://api.cryptowi.re`
	- `CRYPTOWIRE_REFRESH_SECRET` = same value as `NEWS_REFRESH_SECRET`
- Workflows:
	- `.github/workflows/refresh-news.yml` (keeps raw news cache warm)
	- `.github/workflows/refresh-summary.yml` (generates one AI summary every 12 hours)

To persist cached news on Vercel (recommended), also set KV env vars in the API project:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

---
MIT License
