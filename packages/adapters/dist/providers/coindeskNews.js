import { z } from "zod";
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
const toIso = (value) => {
    if (value === undefined)
        return null;
    if (typeof value === "number")
        return new Date(value * 1000).toISOString();
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime()))
        return parsed.toISOString();
    const asNumber = Number(value);
    if (!Number.isNaN(asNumber))
        return new Date(asNumber * 1000).toISOString();
    return null;
};
const nowMinusDaysIso = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
export class CoindeskNewsProvider {
    options;
    name = "CoinDesk";
    constructor(options) {
        this.options = options;
    }
    async fetchHeadlines(params) {
        // eslint-disable-next-line no-console
        console.error('[CoinDesk adapter] fetchHeadlines called. apiKey present:', Boolean(this.options.apiKey));
        if (!this.options.apiKey)
            return [];
        const baseUrl = this.options.baseUrl ?? "https://data-api.coindesk.com";
        const endpointPath = this.options.endpointPath ?? "/news/v1/article/list";
        const url = new URL(endpointPath, baseUrl);
        url.searchParams.set("limit", String(params.limit));
        url.searchParams.set("lang", "EN");
        if (this.options.sourceIds) {
            url.searchParams.set("source_ids", this.options.sourceIds);
        }
        // CoinDesk Data API supports api_key as a query param.
        url.searchParams.set("api_key", this.options.apiKey);
        let res;
        try {
            res = await fetch(url.toString(), {
                headers: {
                    Accept: "application/json",
                },
            });
        }
        catch (err) {
            // eslint-disable-next-line no-console
            console.error("[CoinDesk adapter] Fetch error:", err);
            return [];
        }
        if (!res.ok) {
            let errorText = await res.text();
            // eslint-disable-next-line no-console
            console.error("[CoinDesk adapter] Bad response:", res.status, errorText);
            return [];
        }
        let raw;
        try {
            raw = await res.json();
            const count = Array.isArray(raw?.Data)
                ? raw.Data.length
                : Array.isArray(raw?.data)
                    ? raw.data.length
                    : Array.isArray(raw?.articles)
                        ? raw.articles.length
                        : 0;
            // eslint-disable-next-line no-console
            console.error("[CoinDesk adapter] Raw API response count:", count);
        }
        catch (err) {
            // eslint-disable-next-line no-console
            console.error("[CoinDesk adapter] Invalid JSON:", err);
            return [];
        }
        const parsed = CoindeskResponseSchema.safeParse(raw);
        if (!parsed.success) {
            // eslint-disable-next-line no-console
            console.error("[CoinDesk adapter] Schema parse error:", parsed.error.toString());
            return [];
        }
        const rows = parsed.data.Data ?? parsed.data.data ?? parsed.data.articles ?? [];
        const cutoff = nowMinusDaysIso(params.retentionDays);
        const items = [];
        const normalizeSourceName = (value) => {
            const v = value.trim().toLowerCase();
            if (v === "coindesk")
                return "CoinDesk";
            if (v === "decrypt")
                return "Decrypt";
            if (v === "cointelegraph")
                return "Cointelegraph";
            if (v === "blockworks")
                return "Blockworks";
            if (v === "bitcoinmagazine")
                return "Bitcoin Magazine";
            return value;
        };
        rows.forEach((a, idx) => {
            const title = (a.TITLE ?? a.title ?? "").trim();
            const summary = (a.SUBTITLE ?? a.description ?? a.BODY ?? "").trim();
            const publishedAt = toIso(a.publishedAt ?? a.published_on ?? a.PUBLISHED_ON);
            if (!title || !publishedAt)
                return;
            const category = a.category ??
                a.categories ??
                a.CATEGORY_DATA?.[0]?.CATEGORY ??
                a.CATEGORY_DATA?.[0]?.NAME ??
                "News";
            const sourceFromFields = (() => {
                if (a.SOURCE_DATA?.SOURCE_KEY)
                    return normalizeSourceName(a.SOURCE_DATA.SOURCE_KEY);
                if (a.SOURCE_DATA?.NAME)
                    return normalizeSourceName(a.SOURCE_DATA.NAME);
                // Some responses include numeric SOURCE_IDs (not stable names). Only use
                // source id fields if they look like a non-numeric key.
                const sourceId = a.source_id ?? a.sourceId ?? a.SOURCE_ID;
                if (sourceId !== undefined && sourceId !== null) {
                    const s = String(sourceId).trim();
                    if (s.length > 0 && !/^\d+$/.test(s))
                        return normalizeSourceName(s);
                }
                if (typeof a.source === "string" && a.source)
                    return normalizeSourceName(a.source);
                if (a.source && typeof a.source === "object" && a.source.name)
                    return normalizeSourceName(a.source.name);
                const name = a.source_name ?? a.sourceName;
                if (name)
                    return normalizeSourceName(name);
                // If upstream doesn't provide any source fields, but we queried a single
                // source_id, use that as the source label.
                const configured = (this.options.sourceIds ?? "")
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean);
                if (configured.length === 1)
                    return normalizeSourceName(configured[0]);
                return this.name;
            })();
            const base = {
                id: String(a.ID ?? a.id ?? a.GUID ?? `${this.name}-${publishedAt}-${idx}`),
                title,
                summary,
                source: sourceFromFields,
                category,
                publishedAt,
            };
            const urlValue = a.URL ?? a.url;
            if (urlValue)
                base.url = urlValue;
            const imageUrl = a.IMAGE_URL ?? a.imageUrl ?? a.imageurl;
            if (imageUrl)
                base.imageUrl = imageUrl;
            items.push(base);
        });
        return items.filter((x) => x.publishedAt >= cutoff);
    }
}
