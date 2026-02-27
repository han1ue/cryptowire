# Widget

Use the `cryptowi.re` widget to show latest crypto headlines on your own website.

## Install

1. Add a container where the widget should render.
2. Add the widget script tag.
3. Configure the widget with `data-*` attributes.

## Embed Example

```html
<div id="cw-news"></div>
<script
  src="https://widgets.cryptowi.re/widget.js"
  data-target="#cw-news"
  data-limit="6"
  data-theme="light"
  data-category="Markets"
  data-sources="coindesk,decrypt,cointelegraph"></script>
```

## Options

- `data-target`: CSS selector for mount point
- `data-limit`: number of headlines to show
- `data-theme`: visual theme (for example `light` or `dark`)
- `data-category`: optional category filter
- `data-sources`: optional source-id list

## Behavior

- The widget should be embedded via an `iframe` runtime for style/script isolation.
- Data should come from `https://api.cryptowi.re`.

## Operational Notes

- Keep admin endpoints private (`x-refresh-secret`)
- Add caching on API responses used by widgets
- Add rate limits before opening wide public access
