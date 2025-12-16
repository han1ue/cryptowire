import { Router, type Request } from "express";
import { z } from "zod";
import { NewsCategoriesResponseSchema, NewsListResponseSchema, type NewsItem } from "@cryptowire/types";
import type { NewsService } from "../services/newsService.js";
import type { NewsStore } from "../stores/newsStore.js";

export const createNewsRouter = (
    newsService: NewsService,
    newsStore: NewsStore,
    opts?: { refreshSecret?: string; siteUrl?: string },
) => {
    const router = Router();

    const isProd = process.env.NODE_ENV === "production";
    let devLastAutoRefreshAtMs = 0;
    let devAutoRefreshInFlight: Promise<void> | null = null;

    const escapeXml = (value: string) =>
        value
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&apos;");

    const normalizeSiteUrl = (raw: string) => raw.replace(/\/+$/, "");

    const getPublicSiteUrl = (req: Request) => {
        const configured = typeof opts?.siteUrl === "string" ? opts.siteUrl : null;
        if (configured && configured.startsWith("http")) return normalizeSiteUrl(configured);

        const proto = (req.header("x-forwarded-proto") as string | undefined) ?? "https";
        const host =
            (req.header("x-forwarded-host") as string | undefined) ??
            (req.header("host") as string | undefined) ??
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
        if (v === "cryptopotato") return "CryptoPotato";
        if (v === "forbes") return "Forbes";
        if (v === "cryptopolitan") return "Cryptopolitan";
        if (v === "coinpaprika") return "CoinPaprika";
        if (v === "seekingalpha") return "SeekingAlpha";
        if (v === "bitcoinist") return "Bitcoinist";
        if (v === "newsbtc") return "NewsBTC";
        if (v === "utoday") return "U.Today";
        if (v === "investing_comcryptonews") return "Investing.com";
        if (v === "ethereumfoundation") return "Ethereum Foundation";
        if (v === "bitcoincore") return "Bitcoin Core";
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
        { id: "cryptopotato", name: "CryptoPotato" },
        { id: "forbes", name: "Forbes" },
        { id: "cryptopolitan", name: "Cryptopolitan" },
        { id: "coinpaprika", name: "CoinPaprika" },
        { id: "seekingalpha", name: "SeekingAlpha" },
        { id: "bitcoinist", name: "Bitcoinist" },
        { id: "newsbtc", name: "NewsBTC" },
        { id: "utoday", name: "U.Today" },
        { id: "investing_comcryptonews", name: "Investing.com" },
        { id: "ethereumfoundation", name: "Ethereum Foundation" },
        { id: "bitcoincore", name: "Bitcoin Core" },
    ] as const;

    const sourceIdToName = (id: string) => {
        const found = SUPPORTED_SOURCES.find((s) => s.id === id);
        return found?.name ?? normalizeSourceName(id);
    };

    router.get("/news/sources", async (_req, res) => {
        return res.json({ sources: SUPPORTED_SOURCES });
    });

    router.get("/news/item/:id", async (req, res) => {
        const paramsSchema = z.object({ id: z.string().min(1) });
        const parsed = paramsSchema.safeParse(req.params);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

        const item = await newsStore.getById(parsed.data.id);
        if (!item) return res.status(404).json({ error: "Not found" });
        return res.json({ item });
    });

    router.get("/news/categories", async (req, res) => {
        const querySchema = z.object({
            sources: z.string().optional(),
        });

        const parsed = querySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.message });
        }

        const requestedSourceIds = (parsed.data.sources ?? "")
            .split(",")
            .map((x) => x.trim().toLowerCase())
            .filter(Boolean);

        // If sources aren't specified, return no categories.
        // The product requirement is that categories are scoped to selected sources.
        if (requestedSourceIds.length === 0) {
            const payload = { categories: [] };
            const validated = NewsCategoriesResponseSchema.safeParse(payload);
            if (!validated.success) {
                return res.status(500).json({ error: "Invalid response shape" });
            }
            return res.json(payload);
        }

        const supportedIds = new Set<string>(SUPPORTED_SOURCES.map((s) => s.id));
        const requested = requestedSourceIds.filter((id) => supportedIds.has(id));

        // Categories are updated during refresh (cron/manual) and cached in KV (or memory).
        // This endpoint never triggers provider fetches.
        let list: string[] = [];

        if (requested.length > 0) {
            if (kvEnabled) {
                try {
                    const { kv } = await import("@vercel/kv");
                    const raw = (await kv.hmget<Record<string, unknown>>(
                        KV_CATEGORIES_BY_SOURCE_HASH_KEY,
                        ...requested,
                    )) as unknown;

                    const rows: Array<unknown | null> = Array.isArray(raw)
                        ? (raw as Array<unknown | null>)
                        : raw && typeof raw === "object"
                            ? requested.map((id) => (raw as Record<string, unknown>)[id] ?? null)
                            : [];

                    const merged = new Set<string>();
                    for (const row of rows) {
                        const arr = safeParseJsonArray(row);
                        for (const c of arr) merged.add(normalizeCategory(c));
                    }
                    list = sortCategories(Array.from(merged));
                } catch {
                    const merged = new Set<string>();
                    for (const id of requested) {
                        const arr = categoriesBySourceMemory.get(id) ?? [];
                        for (const c of arr) merged.add(normalizeCategory(c));
                    }
                    list = sortCategories(Array.from(merged));
                }
            } else {
                const merged = new Set<string>();
                for (const id of requested) {
                    const arr = categoriesBySourceMemory.get(id) ?? [];
                    for (const c of arr) merged.add(normalizeCategory(c));
                }
                list = sortCategories(Array.from(merged));
            }
        }

        const payload = { categories: list };
        const validated = NewsCategoriesResponseSchema.safeParse(payload);
        if (!validated.success) {
            return res.status(500).json({ error: "Invalid response shape" });
        }
        return res.json(payload);
    });

    const kvEnabled = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
    const KV_LAST_REFRESH_KEY = "news:lastRefreshAt";
    const KV_CATEGORIES_BY_SOURCE_HASH_KEY = "news:categories:bySource";

    let lastRefreshAtMemory: string | null = null;
    const categoriesBySourceMemory = new Map<string, string[]>();

    const normalizeCategory = (raw: unknown): string => {
        const v = typeof raw === "string" ? raw.trim() : "";
        return v.length > 0 ? v : "News";
    };

    const sortCategories = (cats: string[]) =>
        cats
            .map((c) => c.trim())
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));

    const mergeCategoryLists = (existing: string[], incoming: string[]) => {
        const out: string[] = [];
        const seen = new Set<string>();

        const add = (value: string) => {
            const v = value.trim();
            if (!v) return;
            const key = v.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            out.push(v);
        };

        for (const c of existing) add(c);
        for (const c of incoming) add(c);
        return sortCategories(out);
    };

    const sameCategorySet = (a: string[], b: string[]) => {
        if (a.length !== b.length) return false;
        const ak = a.map((x) => x.trim().toLowerCase()).sort();
        const bk = b.map((x) => x.trim().toLowerCase()).sort();
        for (let i = 0; i < ak.length; i++) if (ak[i] !== bk[i]) return false;
        return true;
    };

    const safeParseJsonArray = (raw: unknown): string[] => {
        const parseStringToArray = (text: string): unknown[] => {
            const t = text.trim();
            if (!t) return [];
            try {
                const v1 = JSON.parse(t) as unknown;
                if (Array.isArray(v1)) return v1;
                // Some KV clients may round-trip JSON strings (double-encoded).
                // Example stored value: "[\"BUSINESS\",\"BTC\"]" (note outer quotes)
                // First parse yields a string "[\"BUSINESS\",...]"; parse again.
                if (typeof v1 === "string") {
                    try {
                        const v2 = JSON.parse(v1) as unknown;
                        return Array.isArray(v2) ? v2 : [];
                    } catch {
                        return [];
                    }
                }
                return [];
            } catch {
                return [];
            }
        };

        const arr = Array.isArray(raw) ? raw : typeof raw === "string" ? parseStringToArray(raw) : [];
        return sortCategories(arr.map((c) => (typeof c === "string" ? normalizeCategory(c) : "")).filter(Boolean));
    };

    const sourceKeyToId = (() => {
        const m = new Map<string, string>();
        for (const s of SUPPORTED_SOURCES) {
            m.set(s.id.trim().toLowerCase(), s.id);
            m.set(s.name.trim().toLowerCase(), s.id);
        }
        return m;
    })();

    const updateCategoriesFromItems = async (items: NewsItem[]): Promise<void> => {
        if (!items || items.length === 0) return;

        const incomingBySource = new Map<string, Set<string>>();

        for (const item of items) {
            const cat = normalizeCategory(item.category);

            const srcKey = item.source.trim().toLowerCase();
            const id = sourceKeyToId.get(srcKey) ?? null;
            if (!id) continue;
            const set = incomingBySource.get(id) ?? new Set<string>();
            set.add(cat);
            incomingBySource.set(id, set);
        }

        for (const [id, set] of incomingBySource) {
            const existing = categoriesBySourceMemory.get(id) ?? [];
            categoriesBySourceMemory.set(id, mergeCategoryLists(existing, Array.from(set)));
        }

        if (!kvEnabled) return;

        try {
            const { kv } = await import("@vercel/kv");
            const touchedSourceIds = Array.from(incomingBySource.keys());

            const rawBySource = await (touchedSourceIds.length > 0
                ? kv.hmget<Record<string, unknown>>(KV_CATEGORIES_BY_SOURCE_HASH_KEY, ...touchedSourceIds)
                : Promise.resolve([] as unknown));

            const rows: Array<unknown | null> = Array.isArray(rawBySource)
                ? (rawBySource as Array<unknown | null>)
                : rawBySource && typeof rawBySource === "object"
                    ? touchedSourceIds.map((id) => (rawBySource as Record<string, unknown>)[id] ?? null)
                    : [];
            const updates: Record<string, unknown> = {};

            for (let i = 0; i < touchedSourceIds.length; i++) {
                const id = touchedSourceIds[i]!;
                const existingForSource = safeParseJsonArray(rows[i]);
                const incomingForSource = sortCategories(Array.from(incomingBySource.get(id) ?? new Set<string>()));
                const merged = mergeCategoryLists(existingForSource, incomingForSource);
                if (!sameCategorySet(existingForSource, merged)) updates[id] = merged;
            }

            if (Object.keys(updates).length > 0) {
                await kv.hset(KV_CATEGORIES_BY_SOURCE_HASH_KEY, updates);
            }
        } catch {
            // ignore
        }
    };

    const setLastRefreshAt = async (iso: string) => {
        lastRefreshAtMemory = iso;
        if (!kvEnabled) return;
        try {
            const { kv } = await import("@vercel/kv");
            // keep for a bit longer than retention so it's visible even if cache is empty
            await kv.set(KV_LAST_REFRESH_KEY, iso, { ex: 8 * 24 * 60 * 60 });
        } catch {
            // ignore
        }
    };

    const getLastRefreshAt = async (): Promise<string | null> => {
        if (!kvEnabled) return lastRefreshAtMemory;
        try {
            const { kv } = await import("@vercel/kv");
            const v = await kv.get(KV_LAST_REFRESH_KEY);
            return typeof v === "string" && v.trim().length > 0 ? v : lastRefreshAtMemory;
        } catch {
            return lastRefreshAtMemory;
        }
    };

    router.get("/news/status", async (_req, res) => {
        return res.json({
            lastRefreshAt: await getLastRefreshAt(),
            now: new Date().toISOString(),
        });
    });

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
        const sourceIdsForFetch = requested.length > 0 ? requested.join(",") : SUPPORTED_SOURCES.map((s) => s.id).join(",");

        const items = await newsService.refreshHeadlines({
            limit,
            retentionDays,
            force: parsed.data.force,
            sourceIds: sourceIdsForFetch,
        });

        await newsStore.putMany(items);

        // Incrementally update cached categories from this refresh batch.
        await updateCategoriesFromItems(items);

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

                let json: unknown = null;
                try {
                    json = text ? JSON.parse(text) : null;
                } catch {
                    json = null;
                }

                const record: Record<string, unknown> | null =
                    json && typeof json === "object" ? (json as Record<string, unknown>) : null;
                const topKeys = record ? Object.keys(record).slice(0, 30) : [];

                const dataCandidate = record ? (record.Data ?? record.data ?? record.articles) : null;
                const dataArr = Array.isArray(dataCandidate) ? dataCandidate : null;
                const first = Array.isArray(dataArr) ? dataArr[0] : null;
                const itemKeys =
                    first && typeof first === "object" ? Object.keys(first as Record<string, unknown>).slice(0, 40) : [];

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
            } catch (err: unknown) {
                return {
                    includeSources,
                    url: url.toString().replace(process.env.COINDESK_API_KEY ?? "", "***"),
                    status: null,
                    ok: false,
                    bodyIsJson: false,
                    topKeys: [],
                    dataCount: 0,
                    firstItemKeys: [],
                    error: err instanceof Error ? err.message : String(err),
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
            const payload = { items: [] };
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

        const maybeDevAutoRefreshIfEmpty = async () => {
            if (isProd) return;
            if (requested.length === 0) return;

            const count = await newsStore.count();
            if (count > 0) return;

            const now = Date.now();
            // Avoid hammering providers during dev HMR reload loops.
            if (now - devLastAutoRefreshAtMs < 60_000) return;

            if (devAutoRefreshInFlight) return devAutoRefreshInFlight;

            devAutoRefreshInFlight = (async () => {
                try {
                    devLastAutoRefreshAtMs = now;

                    const sourceIdsForFetch = requested.join(",");
                    const items = await newsService.refreshHeadlines({
                        limit: 30,
                        retentionDays,
                        force: true,
                        sourceIds: sourceIdsForFetch,
                    });

                    if (items.length > 0) {
                        await newsStore.putMany(items);
                        await updateCategoriesFromItems(items);
                        const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
                        await newsStore.pruneOlderThan(cutoff);
                        await setLastRefreshAt(new Date().toISOString());
                    }
                } catch (error) {
                    console.error("[news] dev auto-refresh failed", error);
                } finally {
                    devAutoRefreshInFlight = null;
                }
            })();

            return devAutoRefreshInFlight;
        };
        const requestedSourceKeys = requested.length > 0
            ? new Set(
                requested
                    .flatMap((id) => [id, sourceIdToName(id)])
                    .map((s) => s.trim().toLowerCase())
                    .filter(Boolean),
            )
            : null;

        const getFilteredPageFromStore = async (): Promise<NewsItem[]> => {

            // Implement offset/limit on the *filtered* sequence by scanning the
            // underlying store in chunks.
            const chunkSize = Math.max(50, Math.min(400, limit * 4));
            const maxChunks = 30; // hard cap to avoid unbounded scans

            let rawOffset = 0;
            let filteredSeen = 0;
            const out: NewsItem[] = [];

            for (let i = 0; i < maxChunks; i++) {
                const chunk = await newsStore.getPage({ limit: chunkSize, offset: rawOffset });
                if (chunk.length === 0) break;

                rawOffset += chunk.length;

                for (const item of chunk) {
                    const srcKey = item.source.trim().toLowerCase();
                    if (requestedSourceKeys && !requestedSourceKeys.has(srcKey)) continue;

                    if (requestedCategoryKey) {
                        const cat = item.category.trim().toLowerCase();
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

        // In production, serve from store (KV/in-memory) only; upstream fetching is done by the scheduled refresh job.
        // In local dev, auto-refresh once if the store is empty so the UI isn't blank.
        await maybeDevAutoRefreshIfEmpty();

        const items = await getFilteredPageFromStore();

        const payload = { items };
        const validated = NewsListResponseSchema.safeParse(payload);
        if (!validated.success) {
            return res.status(500).json({ error: "Invalid response shape" });
        }

        return res.json(payload);
    });

    return router;
};
