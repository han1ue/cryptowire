
# CryptoWire

CryptoWire is a modern crypto news dashboard built with React, TypeScript, and Tailwind CSS.

This repo is a single-repo setup with:

- `apps/frontend` – Vite + React UI
- `apps/api` – Express + TypeScript API (can deploy to Vercel)
- `packages/types` – shared DTOs/zod schemas
- `packages/adapters` – provider adapters (CoinDesk news, CoinGecko prices)

## Getting Started

1. Install dependencies:
	```sh
	npm install
	```
2. Start both frontend + API:
	```sh
	npm run dev
	```

Local URLs:

- Frontend: `http://localhost:8080`
- API: `http://localhost:3001/health`

Environment:

- Set `COINDESK_API_KEY` to enable live news
- News retention defaults to 7 days via `NEWS_RETENTION_DAYS`
- Set `CORS_ORIGIN` (comma-separated) to restrict API CORS origins in production
- Set `GEMINI_API_KEY` to enable AI summary generation with Gemini
- Optional: set `GEMINI_MODEL` (default: `gemini-2.0-flash`)
- Optional fallback: set `OPENAI_API_KEY` (and `OPENAI_MODEL`) if you prefer OpenAI
- Optional: set `NEWS_SUMMARY_FILE_PATH` (default: `data/news-summary-latest.json`) for daily summary file storage
- Optional rate limits: `RATE_LIMIT_WINDOW_SECONDS` (default `60`), `RATE_LIMIT_MAX_REQUESTS` (default `60`), `RATE_LIMIT_SUMMARY_MAX_REQUESTS` (default `20`), `RATE_LIMIT_ADMIN_MAX_REQUESTS` (default `8`)
- Set `VITE_GA_ID` in frontend env to enable Google Analytics in production builds

Quality checks:

- `npm run lint`
- `npm run build`

## Features
- Real-time crypto news
- Saved articles
- Category filtering
- Responsive terminal-inspired UI

## API

- `GET /news?limit=30&retentionDays=7`
- `GET /news/summary` (returns last generated summary from file/cache)
- `GET /news/summary/refresh?hours=24&limit=180` (scheduled/manual summary generation)
- `GET /prices?symbols=BTC,ETH,SOL`

## Vercel deploy (one repo, two projects)

Create two Vercel projects pointing at the same Git repo:

- Frontend project Root Directory: `apps/frontend`
- API project Root Directory: `apps/api`

Set the API project env vars from `.env`.

### Scheduled refresh (Hobby-friendly)

Vercel Hobby cron jobs are limited; this repo uses GitHub Actions to periodically hit the refresh endpoint so users aren’t triggering upstream CoinDesk fetches.

- Configure the API env var `NEWS_REFRESH_SECRET` (any random string)
- Add GitHub repo secrets:
	- `CRYPTOWIRE_API_BASE_URL` = your API deployment root URL (no trailing slash), e.g. `https://your-api.vercel.app`
	- `CRYPTOWIRE_REFRESH_SECRET` = same value as `NEWS_REFRESH_SECRET`
- Workflows:
	- `.github/workflows/refresh-news.yml` (keeps raw news cache warm)
	- `.github/workflows/refresh-summary.yml` (generates one AI summary every 12 hours)

To persist cached news on Vercel (recommended), also set KV env vars in the API project:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

---
MIT License
