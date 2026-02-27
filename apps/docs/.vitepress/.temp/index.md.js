import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"","description":"","frontmatter":{"layout":"home","hero":{"name":"cryptowi.re","text":"Crypto News Aggregator","tagline":"Use the API, embed the latest-news widget, and install the agent skill.","actions":[{"theme":"brand","text":"API Docs","link":"/api"},{"theme":"alt","text":"Widget Install","link":"/widget"},{"theme":"alt","text":"Agent Skill","link":"/agent-skill"}]},"features":[{"title":"API","details":"Pull latest headlines, source lists, prices, and market overview data.","link":"/api"},{"title":"Widget","details":"Embed cryptowi.re headlines on your own website with one script tag.","link":"/widget"},{"title":"Agent Skill","details":"Download and install the cryptowi.re skill for your coding agent.","link":"/agent-skill"}]},"headers":[],"relativePath":"index.md","filePath":"index.md"}');
const _sfc_main = { name: "index.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h2 id="what-is-cryptowi-re" tabindex="-1">What is cryptowi.re? <a class="header-anchor" href="#what-is-cryptowi-re" aria-label="Permalink to &quot;What is cryptowi.re?&quot;">​</a></h2><p><code>cryptowi.re</code> is a crypto news aggregator that collects and normalizes headlines from multiple publishers.</p><h2 id="documentation" tabindex="-1">Documentation <a class="header-anchor" href="#documentation" aria-label="Permalink to &quot;Documentation&quot;">​</a></h2><ul><li><a href="/api">API</a></li><li><a href="/widget">Widget</a></li><li><a href="/agent-skill">Agent Skill</a></li></ul></div>`);
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
