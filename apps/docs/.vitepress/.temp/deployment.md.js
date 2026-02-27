import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Deployment","description":"","frontmatter":{},"headers":[],"relativePath":"deployment.md","filePath":"deployment.md"}');
const _sfc_main = { name: "deployment.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="deployment" tabindex="-1">Deployment <a class="header-anchor" href="#deployment" aria-label="Permalink to &quot;Deployment&quot;">​</a></h1><h2 id="vercel-projects" tabindex="-1">Vercel Projects <a class="header-anchor" href="#vercel-projects" aria-label="Permalink to &quot;Vercel Projects&quot;">​</a></h2><p>Use separate Vercel projects from this monorepo:</p><ul><li>Frontend project root: <code>apps/frontend</code></li><li>API project root: <code>apps/api</code></li><li>Docs project root: <code>apps/docs</code></li></ul><p>For docs (<code>docs.cryptowi.re</code>):</p><ul><li>Framework preset: <code>Other</code></li><li>Install command: <code>npm install</code></li><li>Build command: <code>npm run build</code></li><li>Output directory: <code>.vitepress/dist</code></li></ul><p><code>apps/docs/package.json</code> already defines:</p><ul><li><code>build</code>: <code>vitepress build .</code></li><li><code>dev</code>: <code>vitepress dev .</code></li></ul><h2 id="domain" tabindex="-1">Domain <a class="header-anchor" href="#domain" aria-label="Permalink to &quot;Domain&quot;">​</a></h2><p>After Vercel deploy:</p><ol><li>Add the custom domain <code>docs.cryptowi.re</code> to the docs project.</li><li>Create DNS record in your DNS provider as Vercel instructs.</li><li>Wait for SSL provisioning and verify site is reachable.</li></ol><h2 id="api-scheduled-jobs" tabindex="-1">API Scheduled Jobs <a class="header-anchor" href="#api-scheduled-jobs" aria-label="Permalink to &quot;API Scheduled Jobs&quot;">​</a></h2><p>The refresh jobs in this repo call admin endpoints with <code>POST</code> + <code>x-refresh-secret</code>:</p><ul><li><code>.github/workflows/refresh-news.yml</code></li><li><code>.github/workflows/refresh-summary.yml</code></li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("deployment.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const deployment = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  deployment as default
};
