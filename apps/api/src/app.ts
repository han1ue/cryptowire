import express from "express";
import cors from "cors";
import { getConfig } from "./config.js";
import { NewsService } from "./services/newsService.js";
import { PriceService } from "./services/priceService.js";
import { MarketService } from "./services/marketService.js";
import { createNewsRouter } from "./routes/news.js";
import { createPricesRouter } from "./routes/prices.js";
import { createMarketRouter } from "./routes/market.js";
import { createNewsStore } from "./stores/newsStore.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
    return res.json({
        ok: true,
        name: "CryptoWire API",
        endpoints: {
            api: "/api",
            stats: "/api/stats",
            health: "/api/health",
            news: "/api/news?limit=40&offset=0",
            sources: "/api/news/sources",
            prices: "/api/prices?symbols=BTC,ETH,SOL",
        },
    });
});

app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
});

const config = getConfig();
const newsService = new NewsService(config);
const newsStore = createNewsStore();
const priceService = new PriceService(config);
const marketService = new MarketService();

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
        coindeskApiKeyPresent: Boolean(process.env.COINDESK_API_KEY),
        coindeskBaseUrl: process.env.COINDESK_BASE_URL ?? null,
        coindeskNewsEndpointPath: process.env.COINDESK_NEWS_ENDPOINT_PATH ?? null,
        coindeskSourceIds: config.COINDESK_SOURCE_IDS ?? null,
        retentionDays: config.NEWS_RETENTION_DAYS,
        cacheTtlSeconds: config.NEWS_CACHE_TTL_SECONDS,
        newsCount,
        newestPublishedAt: newest?.publishedAt ?? null,
        oldestPublishedAt: oldest?.publishedAt ?? null,
        lastRefreshAt,
        endpoints: {
            health: "/api/health",
            news: "/api/news?limit=40&offset=0",
            sources: "/api/news/sources",
            refresh: "/api/news/refresh?limit=30",
            prices: "/api/prices?symbols=BTC,ETH,SOL",
            market: "/api/market",
        },
    });
});

app.get("/api", async (_req, res) => {
    return res.json({
        ok: true,
        name: "CryptoWire API",
        kvEnabled,
        endpoints: {
            stats: "/api/stats",
            health: "/api/health",
            news: "/api/news?limit=40&offset=0",
            sources: "/api/news/sources",
            refresh: "/api/news/refresh?limit=30",
            prices: "/api/prices?symbols=BTC,ETH,SOL",
            market: "/api/market",
        },
    });
});

app.use("/api", createNewsRouter(newsService, newsStore, { refreshSecret: config.NEWS_REFRESH_SECRET }));
app.use("/api", createPricesRouter(priceService));
app.use("/api", createMarketRouter(marketService));

export default app;
