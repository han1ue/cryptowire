import { Router } from "express";
import { z } from "zod";
import { NewsListResponseSchema } from "@cryptowire/types";
import type { NewsService } from "../services/newsService.js";
import type { NewsStore } from "../stores/newsStore.js";

export const createNewsRouter = (
    newsService: NewsService,
    newsStore: NewsStore,
    opts?: { refreshSecret?: string; siteUrl?: string },
) => {
    const router = Router();

    const escapeXml = (value: string) =>
        value
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&apos;");

    const normalizeSiteUrl = (raw: string) => raw.replace(/\/+$/, "");

    const getPublicSiteUrl = (req: any) => {
        const configured = typeof opts?.siteUrl === "string" ? opts.siteUrl : null;
        if (configured && configured.startsWith("http")) return normalizeSiteUrl(configured);

        const proto = (req.header?.("x-forwarded-proto") as string | undefined) ?? "https";
        const host =
            (req.header?.("x-forwarded-host") as string | undefined) ??
            (req.header?.("host") as string | undefined) ??
            null;
        if (host) return normalizeSiteUrl(`${proto}://${host}`);

        return "https://cryptowi.re";
    };

    // RSS feed for discovery/syndication (served at /api/rss.xml; frontend rewrites /rss.xml -> /api/rss.xml).
    router.get("/rss.xml", async (req, res) => {
        const siteUrl = getPublicSiteUrl(req);
        const items = await newsStore.getPage({ limit: 50, offset: 0 });
        const lastBuildDate = new Date(items[0]?.publishedAt ?? Date.now()).toUTCString();

        const channelTitle = "cryptowi.re | Crypto News Aggregator";
        const channelLink = siteUrl + "/";
        const channelDescription =
            "Real-time crypto news aggregator. Live headlines from CoinDesk, Decrypt, Cointelegraph, Blockworks, and more.";

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${escapeXml(channelLink)}</link>
    <atom:link href="${escapeXml(siteUrl + "/rss.xml")}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(channelDescription)}</description>
    <language>en</language>
    <lastBuildDate>${escapeXml(lastBuildDate)}</lastBuildDate>
    ${items
                .map((item) => {
                    const link = item.url ? item.url : channelLink;
                    const pubDate = new Date(item.publishedAt).toUTCString();
                    const guid = item.id;
                    const description = item.summary?.trim() ? item.summary.trim() : item.title;
                    const category = item.category?.trim() ? item.category.trim() : "News";
                    const source = item.source?.trim() ? item.source.trim() : "cryptowi.re";

                    return `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="false">${escapeXml(guid)}</guid>
      <pubDate>${escapeXml(pubDate)}</pubDate>
      <description>${escapeXml(description)}</description>
      <category>${escapeXml(category)}</category>
      <source>${escapeXml(source)}</source>
    </item>`;
                })
                .join("")}
  </channel>
</rss>
`;

        res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300, stale-while-revalidate=86400");
        return res.status(200).send(xml);
    });

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
            sources: z.string().optional(),
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

        const requestedSourceIds = (parsed.data.sources ?? "")
            .split(",")
            .map((x) => x.trim().toLowerCase())
            .filter(Boolean);

        const supportedIds = new Set<string>(SUPPORTED_SOURCES.map((s) => s.id));
        const requested = requestedSourceIds.filter((id) => supportedIds.has(id));
        const sourceIdsForFetch = requested.length > 0 ? requested.join(",") : undefined;

        const items = await newsService.refreshHeadlines({
            limit,
            retentionDays,
            force: parsed.data.force,
            sourceIds: sourceIdsForFetch,
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
            sources: z.string().optional(),
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
        const sourceIds = (parsedQuery.data.sources ?? "").trim();

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

        const withSources = sourceIds ? await probeOnce(true) : { skipped: true, reason: "No sources provided" };
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

        // API has no concept of default sources: clients must specify sources.
        if (requestedSourceIds.length === 0) {
            const payload = { items: [], sources: SUPPORTED_SOURCES };
            const validated = NewsListResponseSchema.safeParse(payload);
            if (!validated.success) {
                return res.status(500).json({ error: "Invalid response shape" });
            }
            return res.json(payload);
        }

        const requestedCategory = (parsed.data.category ?? "").trim();
        const requestedCategoryKey = requestedCategory.length > 0 ? requestedCategory.toLowerCase() : null;

        const supportedIds = new Set<string>(SUPPORTED_SOURCES.map((s) => s.id));
        const requested = requestedSourceIds.filter((id) => supportedIds.has(id));
        const requestedSourceNames = requested.length > 0 ? new Set(requested.map(sourceIdToName)) : null;

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
                    if (requestedSourceNames && !requestedSourceNames.has(src)) continue;

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

        const maybeWarmForRequestedSources = async () => {
            if (offset !== 0) return;
            if (!requestedSourceNames || requestedSourceNames.size === 0) return;

            // If the store doesn't have any recent items for one of the requested
            // sources, warm it using the selected source ids. This is important
            // when the defaults exclude an optional source like bitcoin.com.
            const sample = await newsStore.getPage({ limit: 200, offset: 0 });
            const present = new Set<string>();
            for (const item of sample as any[]) {
                const src = typeof item?.source === "string" ? item.source : "";
                if (src) present.add(src);
            }

            const requestedNames = requested.map(sourceIdToName);
            const missing = requestedNames.filter((name) => !present.has(name));
            const isCold = sample.length === 0;
            if (!isCold && missing.length === 0) return;

            const sourceIdsForWarm = requested.join(",");
            const warmed = await newsService.listHeadlines({
                limit: 100,
                retentionDays,
                sourceIds: sourceIdsForWarm,
            });

            if (warmed.length === 0) return;

            await newsStore.putMany(warmed);
            const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
            await newsStore.pruneOlderThan(cutoff);
            await setLastRefreshAt(new Date().toISOString());
        };

        // Serve from store (KV/in-memory). This avoids hitting upstream on every user request.
        await maybeWarmForRequestedSources();
        const items = (await getFilteredPageFromStore()) as any[];

        const payload = { items, sources: SUPPORTED_SOURCES };
        const validated = NewsListResponseSchema.safeParse(payload);
        if (!validated.success) {
            return res.status(500).json({ error: "Invalid response shape" });
        }

        return res.json(payload);
    });

    return router;
};
