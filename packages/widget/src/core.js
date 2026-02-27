const DEFAULTS = Object.freeze({
  sources: "coindesk,decrypt,cointelegraph",
  limit: 6,
  theme: "light",
  title: "",
  minHeight: 340,
});

const POST_MESSAGE_TYPE = "cryptowire:widget:height";

const inBrowser = () => typeof window !== "undefined" && typeof document !== "undefined";

const toNumber = (raw, fallback) => {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clampInt = (raw, min, max, fallback) => {
  const n = Math.floor(toNumber(raw, fallback));
  return Math.min(max, Math.max(min, n));
};

const normalizeTheme = (raw) => {
  const v = String(raw ?? "").trim().toLowerCase();
  return v === "dark" ? "dark" : "light";
};

const normalizeBase = (raw) => {
  const fallback = inBrowser() ? window.location.href : "https://cryptowi.re/widget/widget.js";
  let url;

  try {
    url = new URL(String(raw || ""), fallback);
  } catch {
    return "";
  }

  if (url.pathname.endsWith("/widget.js")) {
    return new URL("./", url).toString().replace(/\/$/, "");
  }

  if (url.pathname.endsWith("/index.html")) {
    return new URL("./", url).toString().replace(/\/$/, "");
  }

  return url.toString().replace(/\/$/, "");
};

const resolveTarget = (target) => {
  if (!inBrowser()) return null;
  if (typeof target === "string") return document.querySelector(target);
  if (target instanceof HTMLElement) return target;
  return null;
};

const createWidgetId = () => `cw-${Math.random().toString(36).slice(2, 10)}`;

const readDataOptions = (scriptEl) => {
  const target = scriptEl.getAttribute("data-target");
  return {
    target: target && target.trim().length > 0 ? target : null,
    apiBase: scriptEl.getAttribute("data-api-base") || "",
    limit: scriptEl.getAttribute("data-limit") || DEFAULTS.limit,
    theme: scriptEl.getAttribute("data-theme") || DEFAULTS.theme,
    category: scriptEl.getAttribute("data-category") || "",
    sources: scriptEl.getAttribute("data-sources") || DEFAULTS.sources,
    title: scriptEl.getAttribute("data-title") || "",
    minHeight: scriptEl.getAttribute("data-min-height") || DEFAULTS.minHeight,
    baseUrl: scriptEl.src,
  };
};

export const mount = (options = {}) => {
  if (!inBrowser()) {
    throw new Error("@cryptowire/widget can only mount in a browser");
  }

  let target = resolveTarget(options.target);
  if (!target && options.scriptEl && options.scriptEl.parentElement) {
    const autoTarget = document.createElement("div");
    options.scriptEl.parentElement.insertBefore(autoTarget, options.scriptEl);
    target = autoTarget;
  }

  if (!target) {
    console.warn("[cryptowi.re widget] target not found");
    return null;
  }

  const base = normalizeBase(options.baseUrl || "");
  if (!base) {
    console.warn("[cryptowi.re widget] invalid base URL");
    return null;
  }

  const widgetId = createWidgetId();
  const src = new URL(`${base}/`);

  src.searchParams.set("widgetId", widgetId);
  src.searchParams.set("sources", String(options.sources || DEFAULTS.sources));
  src.searchParams.set("limit", String(clampInt(options.limit, 1, 20, DEFAULTS.limit)));
  src.searchParams.set("theme", normalizeTheme(options.theme));
  const normalizedTitle = String(options.title ?? "").trim();
  if (normalizedTitle.length > 0) src.searchParams.set("title", normalizedTitle);

  if (options.category) src.searchParams.set("category", String(options.category));
  if (options.apiBase) src.searchParams.set("api", String(options.apiBase));

  const iframe = document.createElement("iframe");
  iframe.src = src.toString();
  iframe.title = normalizedTitle.length > 0 ? normalizedTitle : "cryptowi.re widget";
  iframe.loading = "lazy";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.style.width = "100%";
  iframe.style.border = "0";
  iframe.style.overflow = "hidden";
  iframe.style.display = "block";
  iframe.style.height = `${clampInt(options.minHeight, 120, 2000, DEFAULTS.minHeight)}px`;

  target.replaceChildren(iframe);

  const allowedOrigin = new URL(base).origin;
  const onMessage = (event) => {
    if (event.origin !== allowedOrigin) return;

    const data = event.data;
    if (!data || data.type !== POST_MESSAGE_TYPE || data.widgetId !== widgetId) return;

    const h = toNumber(data.height, 0);
    if (h < 120) return;

    iframe.style.height = `${Math.ceil(h)}px`;
  };

  window.addEventListener("message", onMessage);

  return {
    iframe,
    destroy() {
      window.removeEventListener("message", onMessage);
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    },
  };
};

export const mountFromScript = (scriptEl) => {
  if (!inBrowser()) return null;
  if (!scriptEl || scriptEl.dataset.cwInitialized === "1") return null;

  scriptEl.dataset.cwInitialized = "1";
  const options = readDataOptions(scriptEl);
  return mount({ ...options, scriptEl });
};

export const initFromScripts = (params = {}) => {
  if (!inBrowser()) return [];

  const selector = params.selector || 'script[src*="/widget/widget.js"]';
  const scripts = Array.from(document.querySelectorAll(selector));
  const handles = [];

  for (const scriptEl of scripts) {
    const h = mountFromScript(scriptEl);
    if (h) handles.push(h);
  }

  return handles;
};

export { DEFAULTS, POST_MESSAGE_TYPE, normalizeBase };
