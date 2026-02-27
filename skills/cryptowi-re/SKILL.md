---
name: cryptowi-re
description: Guidance for working in the cryptowi.re monorepo (API, widget, docs) with safe defaults.
---

# cryptowi.re Skill

Use this skill when making changes to the `han1ue/cryptowire` repository.

## Repository Layout

- `apps/api`: Express API
- `apps/frontend`: web app
- `apps/docs`: documentation
- `packages/types`: shared schemas/types
- `packages/adapters`: provider adapters

## API Rules

- Treat `/news/refresh`, `/news/summary/refresh`, and `/news/diagnose` as admin routes.
- Use `POST` with `x-refresh-secret` for manual admin calls.
- Keep public docs focused on public endpoints and integration use cases.

## Docs Rules

- Use branding `cryptowi.re` (lowercase, with dot).
- Prioritize user-facing docs: API usage, widget installation, and agent skill setup.

## Delivery Checklist

1. Build the changed workspace(s).
2. Run full build when cross-workspace behavior changes.
3. Ensure docs examples match current endpoint behavior.
