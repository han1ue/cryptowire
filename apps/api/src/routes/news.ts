import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { NewsCategoriesResponseSchema, NewsListResponseSchema, NewsSummaryResponseSchema, type NewsItem } from "@cryptowire/types";
import { SUPPORTED_NEWS_SOURCES } from "@cryptowire/types/sources";
import type { NewsService } from "../services/newsService.js";
import type { NewsSummaryService } from "../services/newsSummaryService.js";
import type { NewsStore } from "../stores/newsStore.js";
import type { NewsSummaryStore } from "../stores/newsSummaryStore.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const createNewsRouter = (
    newsService: NewsService,
    newsStore: NewsStore,
    newsSummaryService: NewsSummaryService,
    newsSummaryStore: NewsSummaryStore,
    opts?: { refreshSecret?: string; siteUrl?: string; defaultRetentionDays?: number },
) => {
    const router = Router();

    const isProd = process.env.NODE_ENV === "production";
    const DIAGNOSE_UPSTREAM_TIMEOUT_MS = 12_000;
    const defaultRetentionDays = Math.min(Math.max(1, opts?.defaultRetentionDays ?? 7), 7);
    let devLastAutoRefreshAtMs = 0;
    let devAutoRefreshInFlight: Promise<void> | null = null;

    const escapeXml = (value: string) =>
        value
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&apos;");

    const SUPPORTED_SOURCES = SUPPORTED_NEWS_SOURCES;
    const supportedSourceIds = new Set<string>(SUPPORTED_SOURCES.map((s) => s.id));

    const parseSourceIdsFromCsv = (raw: string | undefined): string[] => {
        return (raw ?? "")
            .split(",")
            .map((x) => x.trim().toLowerCase())
            .filter(Boolean);
    };

    const filterSupportedSourceIds = (sourceIds: string[]): string[] => {
        return sourceIds.filter((id) => supportedSourceIds.has(id));
    };

    const uniqueSourceIds = (sourceIds: string[]): string[] => {
        return Array.from(new Set(sourceIds));
    };
    const sendEmptyNewsList = (res: Response) => {
        const payload = { items: [] };
        const validated = NewsListResponseSchema.safeParse(payload);
        if (!validated.success) {
            return res.status(500).json({ error: "Invalid response shape" });
        }
        return res.json(payload);
    };
    const sourceNameByKey = new Map<string, string>();
    for (const source of SUPPORTED_SOURCES) {
        sourceNameByKey.set(source.id.trim().toLowerCase(), source.name);
        sourceNameByKey.set(source.name.trim().toLowerCase(), source.name);
    }

    const normalizeSiteUrl = (raw: string) => raw.replace(/\/+$/, "");
    const configuredSiteUrl = (() => {
        const raw = typeof opts?.siteUrl === "string" ? opts.siteUrl.trim() : "";
        if (raw.startsWith("http://") || raw.startsWith("https://")) return normalizeSiteUrl(raw);
        return "http://localhost:8080";
    })();

    // RSS feed for discovery/syndication (served at /rss.xml).
    router.get("/rss.xml", asyncHandler(async (_req, res) => {
        const siteUrl = configuredSiteUrl;
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
                    const categories = sanitizeCategories(item.categories);
                    const source = item.source?.trim() ? item.source.trim() : "cryptowi.re";

                    return `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="false">${escapeXml(guid)}</guid>
      <pubDate>${escapeXml(pubDate)}</pubDate>
      <description>${escapeXml(description)}</description>
            ${categories.map((c) => `<category>${escapeXml(c)}</category>`).join("")}
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
    }));

    const normalizeSourceName = (value: string) => {
        const v = value.trim().toLowerCase();
        const known = sourceNameByKey.get(v);
        if (known) return known;
        // Best-effort title casing for unknown ids
        return value
            .trim()
            .split(/\s+|_/)
            .filter(Boolean)
            .map((w) => w.slice(0, 1).toUpperCase() + w.slice(1))
            .join(" ");
    };

    const sourceIdToName = (id: string) => {
        const found = SUPPORTED_SOURCES.find((s) => s.id === id);
        return found?.name ?? normalizeSourceName(id);
    };

    router.get("/news/sources", asyncHandler(async (_req, res) => {
        return res.json({ sources: SUPPORTED_SOURCES });
    }));

    router.get("/news/item/:id", asyncHandler(async (req, res) => {
        const paramsSchema = z.object({ id: z.string().min(1) });
        const parsed = paramsSchema.safeParse(req.params);
        if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

        const item = await newsStore.getById(parsed.data.id);
        if (!item) return res.status(404).json({ error: "Not found" });
        return res.json({ item });
    }));

    router.get("/news/categories", asyncHandler(async (req, res) => {
        const querySchema = z.object({
            sources: z.string().optional(),
        });

        const parsed = querySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.message });
        }

        const requestedSourceIds = parseSourceIdsFromCsv(parsed.data.sources);

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

        const requested = filterSupportedSourceIds(requestedSourceIds);

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
    }));

    const kvEnabled = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
    const KV_LAST_REFRESH_KEY = "news:lastRefreshAt";
    const KV_CATEGORIES_BY_SOURCE_HASH_KEY = "news:categories:bySource";
    const KV_SUMMARY_REFRESH_META_KEY = "news:summary:refreshMeta";

    const SummaryRefreshMetaSchema = z.object({
        generatedAt: z.string(),
        windowHours: z.number().int().positive(),
        limit: z.number().int().positive(),
        sourceIds: z.array(z.string().min(1)),
    });

    type SummaryRefreshMeta = z.infer<typeof SummaryRefreshMetaSchema>;

    let lastRefreshAtMemory: string | null = null;
    const categoriesBySourceMemory = new Map<string, string[]>();
    let summaryRefreshMetaMemory: SummaryRefreshMeta | null = null;

    const normalizeSourceIds = (sourceIds: string[]) =>
        Array.from(
            new Set(
                sourceIds
                    .map((sourceId) => sourceId.trim().toLowerCase())
                    .filter(Boolean),
            ),
        ).sort((a, b) => a.localeCompare(b));

    const sameSourceIdSet = (left: string[], right: string[]) => {
        const normalizedLeft = normalizeSourceIds(left);
        const normalizedRight = normalizeSourceIds(right);
        if (normalizedLeft.length !== normalizedRight.length) return false;
        for (let i = 0; i < normalizedLeft.length; i++) {
            if (normalizedLeft[i] !== normalizedRight[i]) return false;
        }
        return true;
    };

    const setSummaryRefreshMeta = async (meta: SummaryRefreshMeta) => {
        const normalized: SummaryRefreshMeta = {
            ...meta,
            sourceIds: normalizeSourceIds(meta.sourceIds),
        };

        summaryRefreshMetaMemory = normalized;

        if (!kvEnabled) return;
        try {
            const { kv } = await import("@vercel/kv");
            await kv.set(KV_SUMMARY_REFRESH_META_KEY, JSON.stringify(normalized), { ex: 8 * 24 * 60 * 60 });
        } catch {
            // ignore
        }
    };

    const getSummaryRefreshMeta = async (): Promise<SummaryRefreshMeta | null> => {
        if (!kvEnabled) return summaryRefreshMetaMemory;

        try {
            const { kv } = await import("@vercel/kv");
            const raw = await kv.get(KV_SUMMARY_REFRESH_META_KEY);

            let parsedRaw: unknown = raw;
            if (typeof raw === "string") {
                try {
                    parsedRaw = JSON.parse(raw) as unknown;
                } catch {
                    return summaryRefreshMetaMemory;
                }
            }

            const parsed = SummaryRefreshMetaSchema.safeParse(parsedRaw);
            if (!parsed.success) return summaryRefreshMetaMemory;

            const normalized: SummaryRefreshMeta = {
                ...parsed.data,
                sourceIds: normalizeSourceIds(parsed.data.sourceIds),
            };
            summaryRefreshMetaMemory = normalized;
            return normalized;
        } catch {
            return summaryRefreshMetaMemory;
        }
    };

    const normalizeCategory = (raw: unknown): string => {
        const v = typeof raw === "string" ? raw.trim() : "";
        if (v.toLowerCase() === "cryptocurrency") return "News";
        return v.length > 0 ? v : "News";
    };

    const sanitizeCategories = (raw: unknown): string[] => {
        const arr = Array.isArray(raw) ? raw : [];
        const normalized = arr.map((c) => normalizeCategory(c));
        const filtered = normalized.filter((c) => c.trim().toLowerCase() !== "cryptocurrency");
        const deduped = Array.from(new Set(filtered.map((c) => c.trim()).filter(Boolean)));
        return deduped.length > 0 ? deduped : ["News"];
    };

    const sanitizeItemCategories = (item: NewsItem): NewsItem => {
        const categories = sanitizeCategories(item.categories);
        if (
            Array.isArray(item.categories) &&
            item.categories.length === categories.length &&
            item.categories.every((c, idx) => c === categories[idx])
        ) {
            return item;
        }
        return { ...item, categories };
    };

    const sortCategories = (cats: string[]) =>
        cats
            .map((c) => c.trim())
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));

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
        const out: string[] = [];
        const seen = new Set<string>();
        for (const rawCategory of arr) {
            const value = typeof rawCategory === "string" ? rawCategory.trim() : "";
            if (!value) continue;
            if (value.toLowerCase() === "cryptocurrency") continue;
            const key = value.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(value);
        }
        return sortCategories(out);
    };

    const sourceKeyToId = (() => {
        const m = new Map<string, string>();
        for (const s of SUPPORTED_SOURCES) {
            m.set(s.id.trim().toLowerCase(), s.id);
            m.set(s.name.trim().toLowerCase(), s.id);
        }
        return m;
    })();

    const rebuildCategoriesFromStore = async (): Promise<void> => {
        const categoriesBySource = new Map<string, Set<string>>();
        for (const source of SUPPORTED_SOURCES) {
            categoriesBySource.set(source.id, new Set<string>());
        }

        const chunkSize = 300;
        const maxChunks = 80;
        let offset = 0;

        for (let i = 0; i < maxChunks; i++) {
            const chunk = await newsStore.getPage({ limit: chunkSize, offset });
            if (chunk.length === 0) break;
            offset += chunk.length;

            for (const item of chunk) {
                const srcKey = item.source.trim().toLowerCase();
                const id = sourceKeyToId.get(srcKey) ?? null;
                if (!id) continue;
                const set = categoriesBySource.get(id);
                if (!set) continue;
                const categories = sanitizeCategories(item.categories);
                for (const rawCategory of categories) {
                    set.add(normalizeCategory(rawCategory));
                }
            }
        }

        categoriesBySourceMemory.clear();
        const serialized: Record<string, unknown> = {};
        for (const source of SUPPORTED_SOURCES) {
            const id = source.id;
            const list = sortCategories(Array.from(categoriesBySource.get(id) ?? new Set<string>()));
            categoriesBySourceMemory.set(id, list);
            serialized[id] = list;
        }

        if (!kvEnabled) return;
        try {
            const { kv } = await import("@vercel/kv");
            await kv.hset(KV_CATEGORIES_BY_SOURCE_HASH_KEY, serialized);
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

    router.get("/news/status", asyncHandler(async (_req, res) => {
        return res.json({
            lastRefreshAt: await getLastRefreshAt(),
            now: new Date().toISOString(),
        });
    }));

    const SUMMARY_DEFAULT_HOURS = 24;
    const SUMMARY_DEFAULT_LIMIT = 180;
    const SUMMARY_MAX_AGE_HOURS = 12;

    const getRequestedSourceIds = (raw: string | undefined): string[] => {
        const requestedSourceIds = parseSourceIdsFromCsv(raw);
        const requested = filterSupportedSourceIds(requestedSourceIds);
        return uniqueSourceIds(requested.length > 0 ? requested : SUPPORTED_SOURCES.map((s) => s.id));
    };

    const collectSummaryItems = async (params: {
        windowHours: number;
        limit: number;
        sourceIds: string[];
    }): Promise<NewsItem[]> => {
        const now = Date.now();
        const windowStartMs = now - params.windowHours * 60 * 60 * 1000;

        const requestedSourceKeys = new Set(
            params.sourceIds
                .flatMap((id) => [id, sourceIdToName(id)])
                .map((s) => s.trim().toLowerCase())
                .filter(Boolean),
        );

        const items: NewsItem[] = [];
        const chunkSize = 200;
        const maxChunks = 40;

        let rawOffset = 0;
        let reachedOlderItems = false;

        for (let i = 0; i < maxChunks; i++) {
            const chunk = await newsStore.getPage({ limit: chunkSize, offset: rawOffset });
            if (chunk.length === 0) break;

            rawOffset += chunk.length;

            for (const item of chunk) {
                const publishedMs = Date.parse(item.publishedAt);
                if (!Number.isFinite(publishedMs)) continue;
                if (publishedMs < windowStartMs) {
                    reachedOlderItems = true;
                    break;
                }

                const sourceKey = item.source.trim().toLowerCase();
                if (!requestedSourceKeys.has(sourceKey)) continue;

                items.push(sanitizeItemCategories(item));
                if (items.length >= params.limit) break;
            }

            if (items.length >= params.limit || reachedOlderItems) break;
        }

        return items;
    };

    const generateAndStoreSummary = async (params: {
        windowHours: number;
        limit: number;
        sourceIds: string[];
    }) => {
        const now = new Date();
        const windowStart = new Date(now.getTime() - params.windowHours * 60 * 60 * 1000);
        const items = await collectSummaryItems({
            windowHours: params.windowHours,
            limit: params.limit,
            sourceIds: params.sourceIds,
        });

        const summary = await newsSummaryService.summarize({
            items,
            sourceIds: params.sourceIds,
            windowHours: params.windowHours,
            windowStart: windowStart.toISOString(),
            windowEnd: now.toISOString(),
        });
        await newsSummaryStore.putLatest(summary);
        await setSummaryRefreshMeta({
            generatedAt: summary.generatedAt,
            windowHours: params.windowHours,
            limit: params.limit,
            sourceIds: params.sourceIds,
        });
        return summary;
    };

    const isSummaryFresh = (iso: string, maxAgeHours: number): boolean => {
        const generatedAtMs = Date.parse(iso);
        if (!Number.isFinite(generatedAtMs)) return false;
        return Date.now() - generatedAtMs <= maxAgeHours * 60 * 60 * 1000;
    };

    const hasSummaryAiError = (summary: z.infer<typeof NewsSummaryResponseSchema>): boolean => {
        return typeof summary.aiError === "string" && summary.aiError.trim().length > 0;
    };

    const normalizeSummaryAiError = (summary: z.infer<typeof NewsSummaryResponseSchema>) => {
        const model = typeof summary.model === "string" && summary.model.trim().length > 0
            ? summary.model.trim()
            : "unknown-model";

        if (summary.aiError) {
            if (model === summary.model) return summary;
            return { ...summary, model };
        }

        if (!model.toLowerCase().startsWith("error-")) {
            if (model === summary.model) return summary;
            return { ...summary, model };
        }

        return {
            ...summary,
            model: "unknown-model",
            aiError: model,
        };
    };

    const refreshSecret = opts?.refreshSecret?.trim() ?? "";
    const isRefreshAuthorized = (req: Request) => {
        // Local dev convenience: allow refresh without a secret in non-production.
        if (!refreshSecret) {
            return !isProd;
        }
        return req.header("x-refresh-secret") === refreshSecret;
    };

    const adminBooleanSchema = z
        .union([z.literal("1"), z.literal("true"), z.literal("0"), z.literal("false"), z.boolean()])
        .optional()
        .transform((v) => v === true || v === "1" || v === "true");

    const summaryRefreshSchema = z.object({
        hours: z.coerce.number().int().positive().max(72).default(SUMMARY_DEFAULT_HOURS),
        limit: z.coerce.number().int().positive().max(500).default(SUMMARY_DEFAULT_LIMIT),
        sources: z.string().optional(),
        force: adminBooleanSchema,
    });

    const newsRefreshSchema = z.object({
        limit: z.coerce.number().int().positive().max(500).default(30),
        retentionDays: z.coerce.number().int().positive().max(30).optional(),
        sources: z.string().optional(),
        force: adminBooleanSchema,
    });

    const diagnoseSchema = z.object({
        limit: z.coerce.number().int().positive().max(200).default(5),
        sources: z.string().optional(),
    });

    router.get("/news/summary", asyncHandler(async (_req, res) => {
        const cached = await newsSummaryStore.getLatest();
        if (cached) {
            const validated = NewsSummaryResponseSchema.safeParse(cached);
            if (!validated.success) return res.status(500).json({ error: "Invalid response shape" });
            const normalized = normalizeSummaryAiError(validated.data);
            if (normalized !== validated.data) {
                await newsSummaryStore.putLatest(normalized);
            }
            return res.json(normalized);
        }

        // Local dev convenience: auto-generate once when no daily file/cache exists.
        if (!isProd) {
            const generated = await generateAndStoreSummary({
                windowHours: SUMMARY_DEFAULT_HOURS,
                limit: SUMMARY_DEFAULT_LIMIT,
                sourceIds: SUPPORTED_SOURCES.map((s) => s.id),
            });
            return res.json(generated);
        }

        return res.status(503).json({
            error: "Daily summary is not ready yet",
            hint: "Run /news/summary/refresh from your scheduled job first.",
        });
    }));

    const summaryRefreshHandler = asyncHandler(async (req, res) => {
        if (!isRefreshAuthorized(req)) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const parsed = summaryRefreshSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.message });
        }

        const existingRaw = await newsSummaryStore.getLatest();
        const existing = existingRaw ? normalizeSummaryAiError(existingRaw) : null;
        if (existing && existing !== existingRaw) {
            await newsSummaryStore.putLatest(existing);
        }
        const requestedSourceIds = getRequestedSourceIds(parsed.data.sources);
        const requestedLimit = Math.min(parsed.data.limit, 250);
        const existingMeta = await getSummaryRefreshMeta();

        if (
            existing &&
            !parsed.data.force &&
            existing.windowHours === parsed.data.hours &&
            existingMeta &&
            existingMeta.windowHours === parsed.data.hours &&
            existingMeta.limit === requestedLimit &&
            sameSourceIdSet(existingMeta.sourceIds, requestedSourceIds) &&
            isSummaryFresh(existing.generatedAt, SUMMARY_MAX_AGE_HOURS) &&
            !hasSummaryAiError(existing)
        ) {
            return res.json({
                ok: true,
                skipped: true,
                reason: "Summary is still fresh",
                generatedAt: existing.generatedAt,
                articleCount: existing.articleCount,
                windowHours: existing.windowHours,
                model: existing.model,
                aiError: existing.aiError,
            });
        }

        const summary = await generateAndStoreSummary({
            windowHours: parsed.data.hours,
            limit: requestedLimit,
            sourceIds: requestedSourceIds,
        });

        return res.json({
            ok: true,
            skipped: false,
            generatedAt: summary.generatedAt,
            articleCount: summary.articleCount,
            windowHours: summary.windowHours,
            model: summary.model,
            aiError: summary.aiError,
        });
    });

    router.post("/news/summary/refresh", summaryRefreshHandler);
    router.get("/news/summary/refresh", asyncHandler(async (_req, res) => {
        return res.status(405).json({ error: "Method not allowed. Use POST with x-refresh-secret header." });
    }));

    const newsRefreshHandler = asyncHandler(async (req, res) => {
        if (!isRefreshAuthorized(req)) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const parsed = newsRefreshSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.message });
        }

        // CoinDesk commonly rejects very large limits; keep this conservative.
        const limit = Math.min(parsed.data.limit, 100);
        const retentionDays = Math.min(parsed.data.retentionDays ?? defaultRetentionDays, 7);

        const requestedSourceIds = parseSourceIdsFromCsv(parsed.data.sources);
        const requested = filterSupportedSourceIds(requestedSourceIds);
        const sourceIdsForFetch = requested.length > 0 ? requested.join(",") : SUPPORTED_SOURCES.map((s) => s.id).join(",");

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
        await rebuildCategoriesFromStore();

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
                    ? "Upstream returned 0 items. Try POST /news/diagnose with x-refresh-secret and body {\"limit\":100} for diagnostics."
                    : null,
        });
    });

    router.post("/news/refresh", newsRefreshHandler);
    router.get("/news/refresh", asyncHandler(async (_req, res) => {
        return res.status(405).json({ error: "Method not allowed. Use POST with x-refresh-secret header." });
    }));

    // Debug helper to understand why refresh returns 0 items in production.
    // Protected by the same refresh secret as /news/refresh.
    router.post("/news/diagnose", asyncHandler(async (req, res) => {
        if (!isRefreshAuthorized(req)) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const parsed = diagnoseSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.message });
        }

        const apiKeyPresent = Boolean(process.env.COINDESK_API_KEY);
        const baseUrl = process.env.COINDESK_BASE_URL ?? "https://data-api.coindesk.com";
        const endpointPath = process.env.COINDESK_NEWS_ENDPOINT_PATH ?? "/news/v1/article/list";
        const sourceIds = (parsed.data.sources ?? "").trim();
        const getSafeUrl = (url: URL): string => {
            const safe = new URL(url.toString());
            safe.searchParams.delete("api_key");
            return safe.toString();
        };

        const buildUrl = (includeSources: boolean) => {
            const url = new URL(endpointPath, baseUrl);
            url.searchParams.set("limit", String(parsed.data.limit));
            url.searchParams.set("lang", "EN");
            if (includeSources && sourceIds) url.searchParams.set("source_ids", sourceIds);
            // CoinDesk Data API supports api_key as a query param.
            if (process.env.COINDESK_API_KEY) url.searchParams.set("api_key", process.env.COINDESK_API_KEY);
            return url;
        };

        const probeOnce = async (includeSources: boolean) => {
            const url = buildUrl(includeSources);
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), DIAGNOSE_UPSTREAM_TIMEOUT_MS);
            try {
                const resp = await fetch(url.toString(), {
                    headers: { Accept: "application/json" },
                    signal: controller.signal,
                });
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
                    url: getSafeUrl(url),
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
                    url: getSafeUrl(url),
                    status: null,
                    ok: false,
                    bodyIsJson: false,
                    topKeys: [],
                    dataCount: 0,
                    firstItemKeys: [],
                    error: err instanceof Error ? err.message : String(err),
                };
            } finally {
                clearTimeout(timeout);
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
    }));

    router.get("/news/diagnose", asyncHandler(async (_req, res) => {
        return res.status(405).json({ error: "Method not allowed. Use POST with x-refresh-secret header." });
    }));

        router.get("/news", asyncHandler(async (req, res) => {
            const querySchema = z.object({
                // Accept a larger input range but clamp below to keep providers happy.
                limit: z.coerce.number().int().positive().max(500).default(30),
                offset: z.coerce.number().int().min(0).max(10_000).default(0),
                retentionDays: z.coerce.number().int().positive().max(30).optional(),
                sources: z.string().optional(),
                category: z.string().optional(),
                cursor: z.string().optional(),
            });

        const parsed = querySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.message });
        }

            const limit = Math.min(parsed.data.limit, 100);
            const offset = parsed.data.offset;
            const retentionDays = Math.min(parsed.data.retentionDays ?? defaultRetentionDays, 7);
            const cursorId = ((parsed.data.cursor ?? "").trim() || undefined);

        const requestedSourceIds = parseSourceIdsFromCsv(parsed.data.sources);

        // API has no concept of default sources: clients must specify sources.
        if (requestedSourceIds.length === 0) {
            return sendEmptyNewsList(res);
        }

        const requestedCategory = (parsed.data.category ?? "").trim();
        const requestedCategoryKey = requestedCategory.length > 0 ? requestedCategory.toLowerCase() : null;

        const requested = filterSupportedSourceIds(requestedSourceIds);

        if (requested.length === 0) {
            return sendEmptyNewsList(res);
        }

        const maybeDevAutoRefreshIfEmpty = async () => {
            if (isProd) return;

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
                        const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
                        await newsStore.pruneOlderThan(cutoff);
                        await rebuildCategoriesFromStore();
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
            const maxChunks = 30; // Hard cap to avoid unbounded scans

            let rawOffset = 0;
            let filteredSeen = 0;
            const out: NewsItem[] = [];

            for (let i = 0; i < maxChunks; i++) {
                const chunk = await newsStore.getPage({ limit: chunkSize, offset: rawOffset, afterId: cursorId });
                if (chunk.length === 0) break;

                rawOffset += chunk.length;

                for (const item of chunk) {
                    const srcKey = item.source.trim().toLowerCase();
                    if (requestedSourceKeys && !requestedSourceKeys.has(srcKey)) continue;

                    if (requestedCategoryKey) {
                        const cats = sanitizeCategories(item.categories);
                        const matches = cats.some((c) => (typeof c === "string" ? c.trim().toLowerCase() : "") === requestedCategoryKey);
                        if (!matches) continue;
                    }

                    if (filteredSeen < offset) {
                        filteredSeen++;
                        continue;
                    }

                    out.push(sanitizeItemCategories(item));
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
    }));

    return router;
};
