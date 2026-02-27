# @cryptowire/widget

Embeddable `cryptowi.re` news widget for websites.

## Install

```sh
npm install @cryptowire/widget
```

## Usage

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

## Script Tag

Use hosted loader directly:

```html
<div id="cw-news"></div>
<script
  src="https://cryptowi.re/widget/widget.js"
  data-target="#cw-news"
  data-limit="6"
  data-theme="light"
  data-sources="coindesk,decrypt,cointelegraph"></script>
```
