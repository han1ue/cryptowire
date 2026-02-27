# Widget

Use the `cryptowi.re` widget to show latest crypto headlines on your own website.

You can integrate it three ways:

1. npm package (`@cryptowire/widget`)
2. Script loader (`/widget/widget.js`)
3. Direct iframe (`/widget`)

## Live Example

Adjust options and see the widget update live.

Use source ids from [References > Sources](/references/sources).

<div style="display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin:12px 0 16px;">
  <label style="display:flex;flex-direction:column;gap:6px;font-size:13px;">
    <span>Sources</span>
    <input
      v-model="liveSources"
      type="text"
      style="padding:8px;border:1px solid var(--vp-c-divider);border-radius:8px;"
      placeholder="coindesk,decrypt,cointelegraph"
    />
  </label>
  <label style="display:flex;flex-direction:column;gap:6px;font-size:13px;">
    <span>Limit (1-20)</span>
    <input
      v-model="liveLimit"
      type="number"
      min="1"
      max="20"
      style="padding:8px;border:1px solid var(--vp-c-divider);border-radius:8px;"
    />
  </label>
  <label style="display:flex;flex-direction:column;gap:6px;font-size:13px;">
    <span>Theme</span>
    <select v-model="liveTheme" style="padding:8px;border:1px solid var(--vp-c-divider);border-radius:8px;">
      <option value="light">light</option>
      <option value="dark">dark</option>
    </select>
  </label>
  <label style="display:flex;flex-direction:column;gap:6px;font-size:13px;">
    <span>Category (optional)</span>
    <input
      v-model="liveCategory"
      type="text"
      style="padding:8px;border:1px solid var(--vp-c-divider);border-radius:8px;"
      placeholder="Markets"
    />
  </label>
  <label style="display:flex;flex-direction:column;gap:6px;font-size:13px;">
    <span>Title (optional)</span>
    <input
      v-model="liveTitle"
      type="text"
      style="padding:8px;border:1px solid var(--vp-c-divider);border-radius:8px;"
      placeholder="Latest crypto news"
    />
  </label>
</div>

<iframe
  :src="liveWidgetUrl"
  title="cryptowi.re widget example"
  style="width:100%;height:420px;border:0;"
  loading="lazy"
  referrerpolicy="strict-origin-when-cross-origin"></iframe>

## Option 1: npm Package

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

Use source ids from [References > Sources](/references/sources).

### npm `mount()` Options

- `target`: CSS selector or HTMLElement
- `baseUrl`: widget page URL (for example `https://cryptowi.re/widget`)
- `sources`: comma-separated source ids (see [References > Sources](/references/sources))
- `limit`: number of headlines to show (1-20)
- `theme`: `light` or `dark`
- `category`: optional category filter
- `title`: optional widget title override
- `apiBase`: optional API base override
- `minHeight`: optional minimum iframe height in pixels

## Option 2: Script Loader

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

Use source ids from [References > Sources](/references/sources).

### Script Options

- `src`: loader URL (`https://cryptowi.re/widget/widget.js`)
- `data-target`: CSS selector for mount point
- `data-limit`: number of headlines to show (1-20)
- `data-theme`: `light` or `dark`
- `data-category`: optional category filter
- `data-sources`: optional source-id list (see [References > Sources](/references/sources))
- `data-title`: optional widget title override
- `data-api-base`: optional API base override
- `data-min-height`: optional minimum iframe height in pixels

## Option 3: Direct iframe

```html
<iframe
  src="https://cryptowi.re/widget?sources=coindesk,decrypt,cointelegraph&limit=6&theme=light"
  title="Latest crypto news"
  style="width:100%;height:420px;border:0;"
  loading="lazy"
  referrerpolicy="strict-origin-when-cross-origin"></iframe>
```

Use source ids from [References > Sources](/references/sources).

### iframe Options

- `src`: widget URL + query params
- `sources`: comma-separated source ids (see [References > Sources](/references/sources))
- `limit`: number of headlines to show (1-20)
- `theme`: `light` or `dark`
- `category`: optional category filter
- `title`: optional widget title override
- `api`: optional API base override
- `style.height`: fixed height (or use script/npm mode for auto-resize)

<script setup>
import { computed, ref } from "vue";

const liveSources = ref("coindesk,decrypt,cointelegraph");
const liveLimit = ref("6");
const liveTheme = ref("light");
const liveCategory = ref("");
const liveTitle = ref("Latest crypto news");

const liveWidgetUrl = computed(() => {
  const parsedLimit = Number.parseInt(String(liveLimit.value), 10);
  const safeLimit = Number.isFinite(parsedLimit) ? Math.min(20, Math.max(1, parsedLimit)) : 6;
  const safeTheme = String(liveTheme.value).toLowerCase() === "dark" ? "dark" : "light";
  const url = new URL("https://cryptowi.re/widget");

  url.searchParams.set("sources", String(liveSources.value || "").trim() || "coindesk,decrypt,cointelegraph");
  url.searchParams.set("limit", String(safeLimit));
  url.searchParams.set("theme", safeTheme);

  const category = String(liveCategory.value || "").trim();
  const title = String(liveTitle.value || "").trim();
  if (category) url.searchParams.set("category", category);
  if (title) url.searchParams.set("title", title);

  return url.toString();
});
</script>
