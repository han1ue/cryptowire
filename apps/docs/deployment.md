# Deployment

## Vercel Projects

Use separate Vercel projects from this monorepo:

- Frontend project root: `apps/frontend`
- API project root: `apps/api`
- Docs project root: `apps/docs`

For docs (`docs.cryptowi.re`):

- Framework preset: `Other`
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `.vitepress/dist`

`apps/docs/package.json` already defines:

- `build`: `vitepress build .`
- `dev`: `vitepress dev .`

## Domain

After Vercel deploy:

1. Add the custom domain `docs.cryptowi.re` to the docs project.
2. Create DNS record in your DNS provider as Vercel instructs.
3. Wait for SSL provisioning and verify site is reachable.

## API Scheduled Jobs

The refresh jobs in this repo call admin endpoints with `POST` + `x-refresh-secret`:

- `.github/workflows/refresh-news.yml`
- `.github/workflows/refresh-summary.yml`
