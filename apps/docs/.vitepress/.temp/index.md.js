import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"CryptoWire Docs","description":"","frontmatter":{},"headers":[],"relativePath":"index.md","filePath":"index.md"}');
const _sfc_main = { name: "index.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="cryptowire-docs" tabindex="-1">CryptoWire Docs <a class="header-anchor" href="#cryptowire-docs" aria-label="Permalink to &quot;CryptoWire Docs&quot;">​</a></h1><p>CryptoWire is a monorepo with:</p><ul><li><code>apps/frontend</code>: React + Vite web app</li><li><code>apps/api</code>: Express API</li><li><code>apps/docs</code>: VitePress docs site</li><li><code>packages/types</code>: shared DTOs/zod schemas</li><li><code>packages/adapters</code>: external data adapters</li></ul><p>Use these docs to run locally, integrate the API, and deploy updates.</p><h2 id="quick-links" tabindex="-1">Quick Links <a class="header-anchor" href="#quick-links" aria-label="Permalink to &quot;Quick Links&quot;">​</a></h2><ul><li><a href="/getting-started">Getting Started</a></li><li><a href="/api">API Endpoints</a></li><li><a href="/deployment">Deployment</a></li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("index.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  index as default
};
