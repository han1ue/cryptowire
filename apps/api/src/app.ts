import express from "express";
import cors from "cors";
import { getConfig } from "./config.js";
import { NewsService } from "./services/newsService.js";
import { PriceService } from "./services/priceService.js";
import { createNewsRouter } from "./routes/news.js";
import { createPricesRouter } from "./routes/prices.js";
import { createNewsStore } from "./stores/newsStore.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
});

const config = getConfig();
const newsService = new NewsService(config);
const newsStore = createNewsStore();
const priceService = new PriceService(config);

const kvEnabled = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
const KV_LAST_REFRESH_KEY = "news:lastRefreshAt";

const getLastRefreshAt = async (): Promise<string | null> => {
    if (!kvEnabled) return null;
    try {
        const { kv } = await import("@vercel/kv");
        const v = await kv.get(KV_LAST_REFRESH_KEY);
        return typeof v === "string" ? v : null;
    } catch {
        return null;
    }
};

app.get("/api/stats", async (_req, res) => {
    const now = new Date().toISOString();
    const newsCount = await newsStore.count();
    const newest = (await newsStore.getPage({ limit: 1, offset: 0 }))[0] ?? null;
    const oldest =
        newsCount > 0 ? (await newsStore.getPage({ limit: 1, offset: Math.max(0, newsCount - 1) }))[0] ?? null : null;
    const lastRefreshAt = await getLastRefreshAt();

    return res.json({
        ok: true,
        now,
        kvEnabled,
        retentionDays: config.NEWS_RETENTION_DAYS,
        cacheTtlSeconds: config.NEWS_CACHE_TTL_SECONDS,
        newsCount,
        newestPublishedAt: newest?.publishedAt ?? null,
        oldestPublishedAt: oldest?.publishedAt ?? null,
        lastRefreshAt,
        endpoints: {
            health: "/api/health",
            news: "/api/news?limit=40&offset=0",
            refresh: "/api/news/refresh?limit=200",
            prices: "/api/prices?symbols=BTC,ETH,SOL",
        },
    });
});

app.get("/api", async (_req, res) => {
    const stats = await (async () => {
        const newsCount = await newsStore.count();
        const newest = (await newsStore.getPage({ limit: 1, offset: 0 }))[0] ?? null;
        const lastRefreshAt = await getLastRefreshAt();
        return { newsCount, newestPublishedAt: newest?.publishedAt ?? null, lastRefreshAt };
    })();

    const html = `<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>CryptoWire API</title>
        <style>
            body{font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding:24px; line-height:1.4;}
            code{background:#f4f4f5; padding:2px 6px; border-radius:6px;}
            .card{border:1px solid #e4e4e7; border-radius:12px; padding:16px; max-width:720px;}
            a{color:#2563eb; text-decoration:none;}
            a:hover{text-decoration:underline;}
            ul{margin:8px 0 0 18px;}
        </style>
    </head>
    <body>
        <div class="card">
            <h1>CryptoWire API</h1>
            <p>Status: <code>ok</code></p>
            <p>KV enabled: <code>${kvEnabled ? "true" : "false"}</code></p>
            <p>News cached: <code>${stats.newsCount}</code></p>
            <p>Newest article: <code>${stats.newestPublishedAt ?? "(none)"}</code></p>
            <p>Last refresh: <code>${stats.lastRefreshAt ?? "(unknown)"}</code></p>

            <p>Useful endpoints:</p>
            <ul>
                <li><a href="/api/stats">/api/stats</a></li>
                <li><a href="/api/health">/api/health</a></li>
                <li><a href="/api/news?limit=40&offset=0">/api/news?limit=40&amp;offset=0</a></li>
            </ul>
        </div>
    </body>
</html>`;

    res.setHeader("content-type", "text/html; charset=utf-8");
    return res.status(200).send(html);
});

app.use("/api", createNewsRouter(newsService, newsStore, { refreshSecret: config.NEWS_REFRESH_SECRET }));
app.use("/api", createPricesRouter(priceService));

export default app;
