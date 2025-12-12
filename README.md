
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
- API: `http://localhost:3001/api/health`

Environment:

- Set `COINDESK_API_KEY` to enable live news
- News retention defaults to 7 days via `NEWS_RETENTION_DAYS`

## Features
- Real-time crypto news
- Saved articles
- Category filtering
- Responsive terminal-inspired UI

## API

- `GET /api/news?limit=30&retentionDays=7`
- `GET /api/prices?symbols=BTC,ETH,SOL`

## Vercel deploy (one repo, two projects)

Create two Vercel projects pointing at the same Git repo:

- Frontend project Root Directory: `apps/frontend`
- API project Root Directory: `apps/api`

Set the API project env vars from `.env`.

### Scheduled refresh (Hobby-friendly)

Vercel Hobby cron jobs are limited; this repo uses GitHub Actions to periodically hit the refresh endpoint so users aren’t triggering upstream CoinDesk fetches.

- Configure the API env var `NEWS_REFRESH_SECRET` (any random string)
- Add GitHub repo secrets:
	- `CRYPTOWIRE_API_BASE_URL` = your API deployment base URL, e.g. `https://your-api.vercel.app`
	- `CRYPTOWIRE_REFRESH_SECRET` = same value as `NEWS_REFRESH_SECRET`
- The workflow is in `.github/workflows/refresh-news.yml`

To persist cached news on Vercel (recommended), also set KV env vars in the API project:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

---
MIT License

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

