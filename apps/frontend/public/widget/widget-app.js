const DEFAULT_SOURCES = "coindesk,decrypt,cointelegraph";
const DEFAULT_TITLE = "Latest crypto news";

const params = new URLSearchParams(window.location.search);

const config = {
  apiBase: (params.get("api") || window.location.origin).trim().replace(/\/$/, ""),
  sources: (params.get("sources") || DEFAULT_SOURCES).trim(),
  category: (params.get("category") || "").trim(),
  title: (params.get("title") || DEFAULT_TITLE).trim(),
  theme: (params.get("theme") || "light").trim().toLowerCase() === "dark" ? "dark" : "light",
  limit: (() => {
    const raw = Number(params.get("limit") || 6);
    if (!Number.isFinite(raw)) return 6;
    return Math.min(20, Math.max(1, Math.floor(raw)));
  })(),
  widgetId: params.get("widgetId") || "",
};

const root = document.getElementById("app");
if (!root) {
  throw new Error("Missing #app root");
}

const formatTimeAgo = (iso) => {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(t).toLocaleDateString();
};

const postHeight = () => {
  const height = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
  window.parent.postMessage(
    {
      type: "cryptowire:widget:height",
      widgetId: config.widgetId,
      height,
    },
    "*",
  );
};

const renderState = (className, text) => {
  const outer = document.createElement("div");
  outer.className = `cw-root theme-${config.theme}`;

  const header = document.createElement("div");
  header.className = "cw-header";

  const title = document.createElement("h2");
  title.className = "cw-title";
  title.textContent = config.title;

  const badge = document.createElement("span");
  badge.className = "cw-badge";
  badge.textContent = "cryptowi.re";

  header.append(title, badge);

  const state = document.createElement("div");
  state.className = className;
  state.textContent = text;

  outer.append(header, state);
  root.replaceChildren(outer);
  postHeight();
};

const renderItems = (items) => {
  const outer = document.createElement("div");
  outer.className = `cw-root theme-${config.theme}`;

  const header = document.createElement("div");
  header.className = "cw-header";

  const title = document.createElement("h2");
  title.className = "cw-title";
  title.textContent = config.title;

  const badge = document.createElement("span");
  badge.className = "cw-badge";
  badge.textContent = `${items.length} headlines`;

  header.append(title, badge);
  outer.append(header);

  const list = document.createElement("ul");
  list.className = "cw-list";

  for (const item of items) {
    const li = document.createElement("li");
    li.className = "cw-item";

    const link = document.createElement("a");
    link.className = "cw-link";
    link.textContent = typeof item.title === "string" ? item.title : "Untitled";
    link.href = typeof item.url === "string" && item.url.trim() ? item.url : `${config.apiBase}/news`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    const meta = document.createElement("div");
    meta.className = "cw-meta";
    const source = typeof item.source === "string" && item.source.trim() ? item.source : "Unknown source";
    const ago = typeof item.publishedAt === "string" ? formatTimeAgo(item.publishedAt) : "";
    meta.textContent = ago ? `${source} · ${ago}` : source;

    li.append(link, meta);
    list.append(li);
  }

  outer.append(list);
  root.replaceChildren(outer);
  postHeight();
};

const load = async () => {
  renderState("cw-loading", "Loading latest headlines...");

  try {
    const url = new URL("/news", `${config.apiBase}/`);
    url.searchParams.set("sources", config.sources || DEFAULT_SOURCES);
    url.searchParams.set("limit", String(config.limit));
    if (config.category) url.searchParams.set("category", config.category);

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      renderState("cw-error", `Unable to load headlines (${res.status}).`);
      return;
    }

    const payload = await res.json();
    const items = Array.isArray(payload?.items) ? payload.items : [];

    if (items.length === 0) {
      renderState("cw-empty", "No headlines found for the selected filters.");
      return;
    }

    renderItems(items);
  } catch {
    renderState("cw-error", "Unable to load headlines right now.");
  }
};

window.addEventListener("resize", postHeight);
if ("ResizeObserver" in window) {
  const observer = new ResizeObserver(() => postHeight());
  observer.observe(document.body);
}

void load();
