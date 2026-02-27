import { ssrRenderAttrs, ssrRenderStyle } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Sources","description":"","frontmatter":{},"headers":[],"relativePath":"references/sources.md","filePath":"references/sources.md"}');
const _sfc_main = { name: "references/sources.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="sources" tabindex="-1">Sources <a class="header-anchor" href="#sources" aria-label="Permalink to &quot;Sources&quot;">​</a></h1><p>Use these source ids anywhere a <code>sources</code> parameter is accepted:</p><ul><li><code>coindesk</code></li><li><code>decrypt</code></li><li><code>cointelegraph</code></li><li><code>blockworks</code></li><li><code>bitcoin.com</code></li><li><code>cryptopotato</code></li><li><code>forbes</code></li><li><code>cryptopolitan</code></li><li><code>coinpaprika</code></li><li><code>seekingalpha</code></li><li><code>bitcoinist</code></li><li><code>newsbtc</code></li><li><code>utoday</code></li><li><code>investing_comcryptonews</code></li><li><code>ethereumfoundation</code></li><li><code>bitcoincore</code></li></ul><p>Fetch the live source list at any time:</p><div class="language-sh vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">sh</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#6F42C1", "--shiki-dark": "#B392F0" })}">curl</span><span style="${ssrRenderStyle({ "--shiki-light": "#032F62", "--shiki-dark": "#9ECBFF" })}"> &quot;https://api.cryptowi.re/news/sources&quot;</span></span></code></pre></div></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("references/sources.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const sources = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  sources as default
};
