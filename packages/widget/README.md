# @cryptowire/widget

Embeddable `cryptowi.re` headlines widget for any website.

## Docs

- Widget docs: https://docs.cryptowi.re/widget
- API docs: https://docs.cryptowi.re/api

## Install (npm)

```sh
npm install @cryptowire/widget
```

## Usage (npm)

```js
import { mount } from "@cryptowire/widget";

mount({
  target: "#cw-news",
  baseUrl: "https://cryptowi.re/widget",
  sources: "coindesk,decrypt,cointelegraph",
  limit: 6,
  theme: "light",
});
```

### `mount()` options

- `target`: CSS selector or HTMLElement where widget should mount
- `baseUrl`: iframe page URL (example: `https://cryptowi.re/widget`)
- `sources`: comma-separated source ids
- `limit`: headline count (`1-20`)
- `theme`: `light` or `dark`
- `category`: optional category filter
- `title`: optional widget title override
- `apiBase`: optional API base override
- `minHeight`: minimum iframe height in px

## Notes

- This package mounts the hosted iframe runtime at `https://cryptowi.re/widget`.
- For script-tag or direct iframe integrations, use: https://docs.cryptowi.re/widget
