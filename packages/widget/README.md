# @cryptowire/widget

Embeddable `cryptowi.re` headlines widget for any website.

## Docs

- Widget docs: https://docs.cryptowi.re/widget
- API docs: https://docs.cryptowi.re/api

## Install (npm)

```sh
npm install @cryptowire/widget
```

## Option 1: npm Usage

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

## Option 2: Script Tag

```html
<div id="cw-news"></div>
<script
  src="https://cryptowi.re/widget/widget.js"
  data-target="#cw-news"
  data-limit="6"
  data-theme="light"
  data-category="Markets"
  data-sources="coindesk,decrypt,cointelegraph"></script>
```

### Script options

- `src`: loader URL (`https://cryptowi.re/widget/widget.js`)
- `data-target`: CSS selector for mount point
- `data-limit`: headline count (`1-20`)
- `data-theme`: `light` or `dark`
- `data-category`: optional category filter
- `data-sources`: optional source-id list
- `data-title`: optional title override
- `data-api-base`: optional API base override
- `data-min-height`: optional minimum iframe height in px

## Option 3: Direct iframe

```html
<iframe
  src="https://cryptowi.re/widget?sources=coindesk,decrypt,cointelegraph&limit=6&theme=light"
  title="Latest crypto news"
  style="width:100%;height:420px;border:0;"
  loading="lazy"
  referrerpolicy="strict-origin-when-cross-origin"></iframe>
```

### iframe query params

- `sources`: comma-separated source ids
- `limit`: headline count (`1-20`)
- `theme`: `light` or `dark`
- `category`: optional category filter
- `title`: optional title override
- `api`: optional API base override
