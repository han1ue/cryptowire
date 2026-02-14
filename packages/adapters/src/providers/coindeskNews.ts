import { z } from "zod";
import type { NewsItem, NewsProvider, FetchHeadlinesParams } from "@cryptowire/types";
import { SUPPORTED_NEWS_SOURCES } from "@cryptowire/types/sources";

const optionalString = z.string().nullish();

const CoindeskSourceDataSchema = z
    .object({
        SOURCE_KEY: optionalString,
        NAME: optionalString,
    })
    .passthrough();

const CoindeskCategoryDataSchema = z
    .object({
        NAME: optionalString,
        CATEGORY: optionalString,
    })
    .passthrough();

const CoindeskArticleSchema = z
    .object({
        // Observed from CoinDesk Data API response (often uppercase)
        ID: z.union([z.string(), z.number()]).optional(),
        GUID: z.union([z.string(), z.number()]).optional(),
        PUBLISHED_ON: z.union([z.string(), z.number()]).optional(),
        IMAGE_URL: optionalString,
        TITLE: optionalString,
        SUBTITLE: optionalString,
        BODY: optionalString,
        URL: optionalString,
        SOURCE_ID: z.union([z.string(), z.number()]).optional(),
        SOURCE_DATA: CoindeskSourceDataSchema.optional(),
        CATEGORY_DATA: z.array(CoindeskCategoryDataSchema).optional(),

        // Also allow lowercase/alternate shapes for safety
        id: z.union([z.string(), z.number()]).optional(),
        title: optionalString,
        description: optionalString,
        url: optionalString,
        published_on: z.union([z.string(), z.number()]).optional(),
        publishedAt: z.string().optional(),
        imageurl: optionalString,
        imageUrl: optionalString,
        categories: optionalString,
        category: optionalString,
        source_id: optionalString,
        sourceId: optionalString,
        source: z
            .union([
                optionalString,
                z
                    .object({
                        id: optionalString,
                        name: optionalString,
                    })
                    .passthrough(),
            ])
            .optional(),
        source_name: optionalString,
        sourceName: optionalString,
    })
    .passthrough();

const CoindeskResponseSchema = z
    .object({
        Data: z.array(CoindeskArticleSchema).optional(),
        data: z.array(CoindeskArticleSchema).optional(),
        articles: z.array(CoindeskArticleSchema).optional(),
    })
    .passthrough();

const toIso = (value: string | number | undefined): string | null => {
    if (value === undefined) return null;
    if (typeof value === "number") return new Date(value * 1000).toISOString();
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    const asNumber = Number(value);
    if (!Number.isNaN(asNumber)) return new Date(asNumber * 1000).toISOString();
    return null;
};

const nowMinusDaysIso = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

const normalizeCategoryValue = (raw: unknown): string | null => {
    const v = typeof raw === "string" ? raw.trim() : "";
    if (v.toLowerCase() === "cryptocurrency") return null;
    return v.length > 0 ? v : null;
};

const dedupeCategories = (values: Array<string | null | undefined>): string[] => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const v of values) {
        const s = (v ?? "").trim();
        if (!s) continue;
        const key = s.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(s);
    }
    return out;
};

const SOURCE_NAME_BY_KEY = new Map<string, string>();
for (const source of SUPPORTED_NEWS_SOURCES) {
    SOURCE_NAME_BY_KEY.set(source.id.trim().toLowerCase(), source.name);
    SOURCE_NAME_BY_KEY.set(source.name.trim().toLowerCase(), source.name);
}
SOURCE_NAME_BY_KEY.set("bitcoinmagazine", "Bitcoin Magazine");

export class CoindeskNewsProvider implements NewsProvider {
    public readonly name = "CoinDesk";

    public constructor(
        private readonly options: {
            apiKey?: string;
            baseUrl?: string;
            endpointPath?: string;
            sourceIds?: string;
        },
    ) { }

    async fetchHeadlines(params: FetchHeadlinesParams): Promise<NewsItem[]> {
        if (!this.options.apiKey) return [];

        const baseUrl = this.options.baseUrl ?? "https://data-api.coindesk.com";
        const endpointPath = this.options.endpointPath ?? "/news/v1/article/list";

        const configuredSourceIds = (this.options.sourceIds ?? "")
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean);

        const normalizeSourceName = (value: string) => {
            const v = value.trim().toLowerCase();
            const known = SOURCE_NAME_BY_KEY.get(v);
            if (known) return known;
            return value;
        };

        const inferSourceFromUrl = (urlValue: string): string | null => {
            try {
                const host = new URL(urlValue).hostname.replace(/^www\./, "").toLowerCase();
                if (host.endsWith("blockworks.co")) return "Blockworks";
                if (host.endsWith("bitcoinmagazine.com")) return "Bitcoin Magazine";
                if (host.endsWith("decrypt.co")) return "Decrypt";
                if (host.endsWith("cointelegraph.com")) return "Cointelegraph";
                if (host.endsWith("coindesk.com")) return "CoinDesk";
                if (host.endsWith("cryptopotato.com")) return "CryptoPotato";
                return null;
            } catch {
                return null;
            }
        };

        const url = new URL(endpointPath, baseUrl);
        url.searchParams.set("limit", String(params.limit));
        url.searchParams.set("lang", "EN");
        if (this.options.sourceIds) {
            url.searchParams.set("source_ids", this.options.sourceIds);
        }

        // CoinDesk Data API supports api_key as a query param.
        url.searchParams.set("api_key", this.options.apiKey);

        let res: Response;
        try {
            res = await fetch(url.toString(), {
                headers: {
                    Accept: "application/json",
                },
            });
        } catch {
            return [];
        }

        if (!res.ok) {
            return [];
        }

        let raw: unknown;
        try {
            raw = await res.json();
        } catch {
            return [];
        }

        const parsed = CoindeskResponseSchema.safeParse(raw);
        if (!parsed.success) {
            return [];
        }

        const rows = parsed.data.Data ?? parsed.data.data ?? parsed.data.articles ?? [];
        const cutoff = nowMinusDaysIso(params.retentionDays);

        const items: NewsItem[] = [];
        rows.forEach((a, idx) => {
            const title = (a.TITLE ?? a.title ?? "").trim();
            const summary = (a.SUBTITLE ?? a.description ?? a.BODY ?? "").trim();
            const publishedAt = toIso(a.publishedAt ?? a.published_on ?? a.PUBLISHED_ON);
            if (!title || !publishedAt) return;

            const categoriesFromCategoryData = Array.isArray(a.CATEGORY_DATA)
                ? a.CATEGORY_DATA.map((c) => normalizeCategoryValue(c.CATEGORY ?? c.NAME))
                : [];

            const categoriesFromStrings = (() => {
                const raw = normalizeCategoryValue(a.categories ?? a.category);
                if (!raw) return [];
                // Best-effort split for providers that return comma-separated categories.
                const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
                return parts.length > 1 ? parts : [raw];
            })();

            const categories = (() => {
                const merged = dedupeCategories([...categoriesFromCategoryData, ...categoriesFromStrings]);
                return merged.length > 0 ? merged : ["News"];
            })();

            const urlValue = (a.URL ?? a.url ?? "").trim();

            const sourceFromFields = (() => {
                if (a.SOURCE_DATA?.SOURCE_KEY) return normalizeSourceName(a.SOURCE_DATA.SOURCE_KEY);
                if (a.SOURCE_DATA?.NAME) return normalizeSourceName(a.SOURCE_DATA.NAME);

                // Some responses include numeric SOURCE_IDs (not stable names). Only use
                // source id fields if they look like a non-numeric key.
                const sourceIdValue = a.source_id ?? a.sourceId ?? a.SOURCE_ID;
                if (sourceIdValue !== undefined && sourceIdValue !== null) {
                    const s = String(sourceIdValue).trim();
                    if (s.length > 0 && !/^\d+$/.test(s)) return normalizeSourceName(s);
                }

                if (typeof a.source === "string" && a.source) return normalizeSourceName(a.source);
                if (a.source && typeof a.source === "object" && a.source.name) return normalizeSourceName(a.source.name);
                const name = a.source_name ?? a.sourceName;
                if (name) return normalizeSourceName(name);

                // Fallback: infer from URL host (works well for Blockworks).
                if (urlValue) {
                    const inferred = inferSourceFromUrl(urlValue);
                    if (inferred) return inferred;
                }

                // If upstream doesn't provide any source fields, but we queried a single
                // source_id, use that as the source label.
                if (configuredSourceIds.length === 1) return normalizeSourceName(configuredSourceIds[0]!);

                return this.name;
            })();

            const base: NewsItem = {
                id: String(a.ID ?? a.id ?? a.GUID ?? `${this.name}-${publishedAt}-${idx}`),
                title,
                summary,
                source: sourceFromFields,
                categories,
                publishedAt,
            };

            if (urlValue) base.url = urlValue;

            const imageUrl = a.IMAGE_URL ?? a.imageUrl ?? a.imageurl;
            if (imageUrl) base.imageUrl = imageUrl;

            items.push(base);
        });

        return items.filter((x) => x.publishedAt >= cutoff);
    }
}
