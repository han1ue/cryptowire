import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"","description":"","frontmatter":{"layout":"home","hero":{"name":"cryptowi.re","text":"Crypto News Aggregator","tagline":"Use the API, embed the latest-news widget, and give your agent API instructions.","actions":[{"theme":"brand","text":"API Docs","link":"/api"},{"theme":"alt","text":"Widget Install","link":"/widget"},{"theme":"alt","text":"Agent Instructions","link":"/agent-skill"}]},"features":[{"title":"API","details":"Pull latest headlines, source lists, prices, and market overview data.","link":"/api"},{"title":"Widget","details":"Embed cryptowi.re headlines on your own website with one script tag.","link":"/widget"},{"title":"Agent Instructions","details":"Share one link so your agent follows cryptowi.re API usage rules.","link":"/agent-skill"}]},"headers":[],"relativePath":"index.md","filePath":"index.md"}');
const _sfc_main = { name: "index.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}></div>`);
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
