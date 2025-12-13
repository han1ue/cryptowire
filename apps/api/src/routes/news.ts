import { Router } from "express";
import { z } from "zod";
import { NewsListResponseSchema } from "@cryptowire/types";
import { DEFAULT_COINDESK_SOURCE_IDS } from "../config.js";
import type { NewsService } from "../services/newsService.js";
import type { NewsStore } from "../stores/newsStore.js";

export const createNewsRouter = (
    newsService: NewsService,
    newsStore: NewsStore,
    opts?: { refreshSecret?: string },
) => {
    const router = Router();

    const normalizeSourceName = (value: string) => {
        const v = value.trim().toLowerCase();
        if (v === "coindesk") return "CoinDesk";
        if (v === "decrypt") return "Decrypt";
        if (v === "cointelegraph") return "Cointelegraph";
        if (v === "blockworks") return "Blockworks";
        if (v === "bitcoin.com") return "bitcoin.com";
        // Best-effort title casing for unknown ids
        return value
            .trim()
            .split(/\s+|_/)
            .filter(Boolean)
            .map((w) => w.slice(0, 1).toUpperCase() + w.slice(1))
            .join(" ");
    };

    const SUPPORTED_SOURCES = [
        { id: "coindesk", name: "CoinDesk" },
        { id: "decrypt", name: "Decrypt" },
        { id: "cointelegraph", name: "Cointelegraph" },
        { id: "blockworks", name: "Blockworks" },
        { id: "bitcoin.com", name: "bitcoin.com" },
    ] as const;

    // Backend-owned defaults: these are the sources we show on first load.
    const DEFAULT_SOURCE_IDS = ["coindesk", "decrypt", "cointelegraph", "blockworks"] as const;

    const sourceIdToName = (id: string) => {
        const found = SUPPORTED_SOURCES.find((s) => s.id === id);
        return found?.name ?? normalizeSourceName(id);
    };

    router.get("/news/sources", async (_req, res) => {
        return res.json({ sources: SUPPORTED_SOURCES });
    });

    const kvEnabled = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
    const KV_LAST_REFRESH_KEY = "news:lastRefreshAt";
    const setLastRefreshAt = async (iso: string) => {
        if (!kvEnabled) return;
        try {
            const { kv } = await import("@vercel/kv");
            // keep for a bit longer than retention so it's visible even if cache is empty
            await kv.set(KV_LAST_REFRESH_KEY, iso, { ex: 8 * 24 * 60 * 60 });
        } catch {
            // ignore
        }
    };

    router.get("/news/refresh", async (req, res) => {
        const querySchema = z.object({
            limit: z.coerce.number().int().positive().max(500).default(30),
            retentionDays: z.coerce.number().int().positive().max(30).optional(),
            force: z
                .union([z.literal("1"), z.literal("true"), z.literal("0"), z.literal("false")])
                .optional()
                .transform((v) => v === "1" || v === "true"),
            secret: z.string().optional(),
        });

        const parsed = querySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.message });
        }

        // Optional protection for cron/warm endpoints.
        // Vercel Cron requests include `x-vercel-cron: 1`, which we allow.
        const expected = opts?.refreshSecret;
        const isVercelCron = req.header("x-vercel-cron") === "1";
        if (!isVercelCron && expected && parsed.data.secret !== expected && req.header("x-refresh-secret") !== expected) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // CoinDesk commonly rejects very large limits; keep this conservative.
        const limit = Math.min(parsed.data.limit, 100);
        const retentionDays = Math.min(parsed.data.retentionDays ?? 7, 7);
        const items = await newsService.refreshHeadlines({
            limit,
            retentionDays,
            force: parsed.data.force,
        });

        await newsStore.putMany(items);

        // Keep only up to one week old in storage.
        const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
        await newsStore.pruneOlderThan(cutoff);

        await setLastRefreshAt(new Date().toISOString());

        return res.json({
            ok: true,
            count: items.length,
            limit,
            retentionDays,
            force: Boolean(parsed.data.force),
            refreshedAt: new Date().toISOString(),
            note:
                items.length === 0
                    ? "Upstream returned 0 items. Try /api/news/diagnose?limit=100 to see the CoinDesk response details (status/body)."
                    : null,
        });
    });

    // Debug helper to understand why refresh returns 0 items in production.
    // Protected by the same refresh secret as /news/refresh.
    router.get("/news/diagnose", async (req, res) => {
        const querySchema = z.object({
            limit: z.coerce.number().int().positive().max(200).default(5),
        });

        const parsedQuery = querySchema.safeParse(req.query);
        if (!parsedQuery.success) {
            return res.status(400).json({ error: parsedQuery.error.message });
        }

        const expected = opts?.refreshSecret;
        const isVercelCron = req.header("x-vercel-cron") === "1";
        if (!isVercelCron && expected && req.header("x-refresh-secret") !== expected) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const apiKeyPresent = Boolean(process.env.COINDESK_API_KEY);
        const baseUrl = process.env.COINDESK_BASE_URL ?? "https://data-api.coindesk.com";
        const endpointPath = process.env.COINDESK_NEWS_ENDPOINT_PATH ?? "/news/v1/article/list";
        const sourceIds = DEFAULT_COINDESK_SOURCE_IDS;

        const buildUrl = (includeSources: boolean) => {
            const url = new URL(endpointPath, baseUrl);
            url.searchParams.set("limit", String(parsedQuery.data.limit));
            url.searchParams.set("lang", "EN");
            if (includeSources && sourceIds) url.searchParams.set("source_ids", sourceIds);
            // CoinDesk Data API supports api_key as a query param.
            if (process.env.COINDESK_API_KEY) url.searchParams.set("api_key", process.env.COINDESK_API_KEY);
            return url;
        };

        const probeOnce = async (includeSources: boolean) => {
            const url = buildUrl(includeSources);
            try {
                const resp = await fetch(url.toString(), { headers: { Accept: "application/json" } });
                const text = await resp.text();

                let json: any = null;
                try {
                    json = text ? JSON.parse(text) : null;
                } catch {
                    json = null;
                }

                const topKeys = json && typeof json === "object" ? Object.keys(json).slice(0, 30) : [];
                const dataArr = Array.isArray(json?.Data)
                    ? json.Data
                    : Array.isArray(json?.data)
                        ? json.data
                        : Array.isArray(json?.articles)
                            ? json.articles
                            : null;
                const itemKeys = Array.isArray(dataArr) && dataArr[0] && typeof dataArr[0] === "object"
                    ? Object.keys(dataArr[0]).slice(0, 40)
                    : [];

                return {
                    includeSources,
                    url: url.origin + url.pathname + "?" + url.searchParams.toString().replace(process.env.COINDESK_API_KEY ?? "", "***"),
                    status: resp.status,
                    ok: resp.ok,
                    bodyIsJson: json !== null,
                    topKeys,
                    dataCount: Array.isArray(dataArr) ? dataArr.length : 0,
                    firstItemKeys: itemKeys,
                    bodyPreview: text.slice(0, 800),
                };
            } catch (err: any) {
                return {
                    includeSources,
                    url: url.toString().replace(process.env.COINDESK_API_KEY ?? "", "***"),
                    status: null,
                    ok: false,
                    bodyIsJson: false,
                    topKeys: [],
                    dataCount: 0,
                    firstItemKeys: [],
                    error: String(err?.message ?? err),
                };
            }
        };

        const withSources = await probeOnce(true);
        const withoutSources = await probeOnce(false);

        return res.json({
            ok: true,
            coindeskApiKeyPresent: apiKeyPresent,
            probes: {
                withSources,
                withoutSources,
            },
        });
    });

    router.get("/news", async (req, res) => {
        const querySchema = z.object({
            // Accept a larger input range but clamp below to keep providers happy.
            limit: z.coerce.number().int().positive().max(500).default(30),
            offset: z.coerce.number().int().min(0).max(10_000).default(0),
            retentionDays: z.coerce.number().int().positive().max(30).optional(),
            sources: z.string().optional(),
            category: z.string().optional(),
        });

        const parsed = querySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.message });
        }

        const limit = Math.min(parsed.data.limit, 100);
        const offset = parsed.data.offset;
        const retentionDays = Math.min(parsed.data.retentionDays ?? 7, 7);

        const requestedSourceIds = (parsed.data.sources ?? "")
            .split(",")
            .map((x) => x.trim().toLowerCase())
            .filter(Boolean);

        const requestedCategory = (parsed.data.category ?? "").trim();
        const requestedCategoryKey = requestedCategory.length > 0 ? requestedCategory.toLowerCase() : null;

        const supportedIds = new Set<string>(SUPPORTED_SOURCES.map((s) => s.id));
        const requested = requestedSourceIds.filter((id) => supportedIds.has(id));
        const defaultSourceNames = new Set(DEFAULT_SOURCE_IDS.map(sourceIdToName));
        const requestedSourceNames = requested.length > 0 ? new Set(requested.map(sourceIdToName)) : defaultSourceNames;

        const getFilteredPageFromStore = async (): Promise<unknown[]> => {

            // Implement offset/limit on the *filtered* sequence by scanning the
            // underlying store in chunks.
            const chunkSize = Math.max(50, Math.min(400, limit * 4));
            const maxChunks = 30; // hard cap to avoid unbounded scans

            let rawOffset = 0;
            let filteredSeen = 0;
            const out: unknown[] = [];

            for (let i = 0; i < maxChunks; i++) {
                const chunk = await newsStore.getPage({ limit: chunkSize, offset: rawOffset });
                if (chunk.length === 0) break;

                rawOffset += chunk.length;

                for (const item of chunk as any[]) {
                    const src = typeof item?.source === "string" ? item.source : "";
                    if (!requestedSourceNames.has(src)) continue;

                    if (requestedCategoryKey) {
                        const cat = typeof item?.category === "string" ? item.category.trim().toLowerCase() : "";
                        if (cat !== requestedCategoryKey) continue;
                    }

                    if (filteredSeen < offset) {
                        filteredSeen++;
                        continue;
                    }

                    out.push(item);
                    if (out.length >= limit) return out;
                }
            }

            return out;
        };

        // Serve from store (KV/in-memory). This avoids hitting upstream on every user request.
        let items = (await getFilteredPageFromStore()) as any[];
        if (items.length === 0 && offset === 0) {
            // Cold start: warm the store once.
            const warmed = await newsService.refreshHeadlines({
                limit: 100,
                retentionDays,
                force: true,
            });
            await newsStore.putMany(warmed);
            const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
            await newsStore.pruneOlderThan(cutoff);
            await setLastRefreshAt(new Date().toISOString());
            items = (await getFilteredPageFromStore()) as any[];
        }

        const payload = { items, sources: SUPPORTED_SOURCES, defaultSources: Array.from(DEFAULT_SOURCE_IDS) };
        const validated = NewsListResponseSchema.safeParse(payload);
        if (!validated.success) {
            return res.status(500).json({ error: "Invalid response shape" });
        }

        return res.json(payload);
    });

    return router;
};
