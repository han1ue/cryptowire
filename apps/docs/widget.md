# Widget

Use the `cryptowi.re` widget to show latest crypto headlines on your own website.

You can integrate it three ways:

1. Script loader (`/widget/widget.js`)
2. Direct iframe (`/widget`)
3. npm package (`@cryptowire/widget`)

## Option 1: Script Loader

## Embed Example

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

## Option 2: Direct iframe

```html
<iframe
  src="https://cryptowi.re/widget?sources=coindesk,decrypt,cointelegraph&limit=6&theme=light"
  title="Latest crypto news"
  style="width:100%;height:420px;border:0;"
  loading="lazy"
  referrerpolicy="strict-origin-when-cross-origin"></iframe>
```

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

## Options

- `data-target`: CSS selector for mount point
- `data-limit`: number of headlines to show
- `data-theme`: visual theme (for example `light` or `dark`)
- `data-category`: optional category filter
- `data-sources`: optional source-id list

## Behavior

- The widget should be embedded via an `iframe` runtime for style/script isolation.
- By default, widget requests use the same domain as the loader (`cryptowi.re`), which rewrites API paths to the backend.
- npm integration mounts the same iframe runtime and uses the same postMessage auto-height behavior.

## Operational Notes

- Keep admin endpoints private (`x-refresh-secret`)
- Add caching on API responses used by widgets
- Add rate limits before opening wide public access
