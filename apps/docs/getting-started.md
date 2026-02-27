# Getting Started

## Prerequisites

- Node.js 20+
- npm 10+

## Install

```sh
npm install
```

## Run Apps

Start frontend + API:

```sh
npm run dev
```

Run docs locally:

```sh
npm run dev -w @cryptowire/docs
```

Default local URLs:

- Frontend: `http://localhost:8080`
- API: `http://localhost:3001`
- Docs: `http://localhost:5173`

## Environment

Set values in `.env` for API behavior:

- `COINDESK_API_KEY`
- `NEWS_REFRESH_SECRET`
- `CORS_ORIGIN`
- `OPENAI_API_KEY` or `GEMINI_API_KEY`
- `KV_REST_API_URL` and `KV_REST_API_TOKEN` (optional, recommended for persistence)
