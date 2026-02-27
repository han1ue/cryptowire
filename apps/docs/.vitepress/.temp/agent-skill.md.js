import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Agent Instructions","description":"","frontmatter":{},"headers":[],"relativePath":"agent-skill.md","filePath":"agent-skill.md"}');
const _sfc_main = { name: "agent-skill.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="agent-instructions" tabindex="-1">Agent Instructions <a class="header-anchor" href="#agent-instructions" aria-label="Permalink to &quot;Agent Instructions&quot;">​</a></h1><p>Send this to your agent:</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Read https://cryptowi.re/skill.md and follow the instructions when using the cryptowi.re API.</span></span></code></pre></div><p>Direct link: <code>https://cryptowi.re/skill.md</code></p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("agent-skill.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const agentSkill = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  agentSkill as default
};
