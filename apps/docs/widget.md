# Widget

Use the `cryptowi.re` widget to show latest crypto headlines on your own website.

You can integrate it three ways:

1. Script loader (`/widget/widget.js`)
2. Direct iframe (`/widget`)
3. npm package (`@cryptowire/widget`)

## Option 1: Script Loader

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

Use source ids from [References](/references#sources).

### Script Options

- `src`: loader URL (`https://cryptowi.re/widget/widget.js`)
- `data-target`: CSS selector for mount point
- `data-limit`: number of headlines to show (1-20)
- `data-theme`: `light` or `dark`
- `data-category`: optional category filter
- `data-sources`: optional source-id list (see [References](/references#sources))
- `data-title`: optional widget title override
- `data-api-base`: optional API base override
- `data-min-height`: optional minimum iframe height in pixels

## Option 2: Direct iframe

```html
<iframe
  src="https://cryptowi.re/widget?sources=coindesk,decrypt,cointelegraph&limit=6&theme=light"
  title="Latest crypto news"
  style="width:100%;height:420px;border:0;"
  loading="lazy"
  referrerpolicy="strict-origin-when-cross-origin"></iframe>
```

Use source ids from [References](/references#sources).

### iframe Options

- `src`: widget URL + query params
- `sources`: comma-separated source ids (see [References](/references#sources))
- `limit`: number of headlines to show (1-20)
- `theme`: `light` or `dark`
- `category`: optional category filter
- `title`: optional widget title override
- `api`: optional API base override
- `style.height`: fixed height (or use script/npm mode for auto-resize)

## Option 3: npm Package

```sh
npm install @cryptowire/widget
```

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

Use source ids from [References](/references#sources).

### npm `mount()` Options

- `target`: CSS selector or HTMLElement
- `baseUrl`: widget page URL (for example `https://cryptowi.re/widget`)
- `sources`: comma-separated source ids (see [References](/references#sources))
- `limit`: number of headlines to show (1-20)
- `theme`: `light` or `dark`
- `category`: optional category filter
- `title`: optional widget title override
- `apiBase`: optional API base override
- `minHeight`: optional minimum iframe height in pixels
