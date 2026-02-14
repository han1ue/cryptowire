import { z } from "zod";
export * from "./sources.js";
export declare const NewsItemSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    summary: z.ZodDefault<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    source: z.ZodString;
    categories: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    publishedAt: z.ZodString;
    imageUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    title: string;
    summary: string;
    source: string;
    categories: string[];
    publishedAt: string;
    url?: string | undefined;
    imageUrl?: string | undefined;
}, {
    id: string;
    title: string;
    source: string;
    publishedAt: string;
    summary?: string | undefined;
    url?: string | undefined;
    categories?: string[] | undefined;
    imageUrl?: string | undefined;
}>;
export type NewsItem = z.infer<typeof NewsItemSchema>;
export declare const NewsSourceSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
}, {
    id: string;
    name: string;
}>;
export type NewsSource = z.infer<typeof NewsSourceSchema>;
export declare const NewsListResponseSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        summary: z.ZodDefault<z.ZodString>;
        url: z.ZodOptional<z.ZodString>;
        source: z.ZodString;
        categories: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        publishedAt: z.ZodString;
        imageUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        title: string;
        summary: string;
        source: string;
        categories: string[];
        publishedAt: string;
        url?: string | undefined;
        imageUrl?: string | undefined;
    }, {
        id: string;
        title: string;
        source: string;
        publishedAt: string;
        summary?: string | undefined;
        url?: string | undefined;
        categories?: string[] | undefined;
        imageUrl?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    items: {
        id: string;
        title: string;
        summary: string;
        source: string;
        categories: string[];
        publishedAt: string;
        url?: string | undefined;
        imageUrl?: string | undefined;
    }[];
}, {
    items: {
        id: string;
        title: string;
        source: string;
        publishedAt: string;
        summary?: string | undefined;
        url?: string | undefined;
        categories?: string[] | undefined;
        imageUrl?: string | undefined;
    }[];
}>;
export type NewsListResponse = z.infer<typeof NewsListResponseSchema>;
export declare const NewsCategoriesResponseSchema: z.ZodObject<{
    categories: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    categories: string[];
}, {
    categories: string[];
}>;
export type NewsCategoriesResponse = z.infer<typeof NewsCategoriesResponseSchema>;
export declare const NewsSummaryHighlightSchema: z.ZodObject<{
    title: z.ZodString;
    detail: z.ZodString;
    sources: z.ZodArray<z.ZodString, "many">;
    url: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title: string;
    detail: string;
    sources: string[];
    url?: string | undefined;
}, {
    title: string;
    detail: string;
    sources: string[];
    url?: string | undefined;
}>;
export type NewsSummaryHighlight = z.infer<typeof NewsSummaryHighlightSchema>;
export declare const NewsSummarySourceCoverageSchema: z.ZodObject<{
    sourceId: z.ZodString;
    source: z.ZodString;
    articleCount: z.ZodNumber;
    reputationWeight: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    source: string;
    sourceId: string;
    articleCount: number;
    reputationWeight: number;
}, {
    source: string;
    sourceId: string;
    articleCount: number;
    reputationWeight: number;
}>;
export type NewsSummarySourceCoverage = z.infer<typeof NewsSummarySourceCoverageSchema>;
export declare const NewsSummaryResponseSchema: z.ZodObject<{
    generatedAt: z.ZodString;
    windowStart: z.ZodString;
    windowEnd: z.ZodString;
    windowHours: z.ZodNumber;
    articleCount: z.ZodNumber;
    model: z.ZodEffects<z.ZodOptional<z.ZodNullable<z.ZodString>>, string, string | null | undefined>;
    aiError: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    summary: z.ZodString;
    highlights: z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        detail: z.ZodString;
        sources: z.ZodArray<z.ZodString, "many">;
        url: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        detail: string;
        sources: string[];
        url?: string | undefined;
    }, {
        title: string;
        detail: string;
        sources: string[];
        url?: string | undefined;
    }>, "many">;
    sourceCoverage: z.ZodArray<z.ZodObject<{
        sourceId: z.ZodString;
        source: z.ZodString;
        articleCount: z.ZodNumber;
        reputationWeight: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        source: string;
        sourceId: string;
        articleCount: number;
        reputationWeight: number;
    }, {
        source: string;
        sourceId: string;
        articleCount: number;
        reputationWeight: number;
    }>, "many">;
    notes: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    summary: string;
    articleCount: number;
    generatedAt: string;
    windowStart: string;
    windowEnd: string;
    windowHours: number;
    model: string;
    aiError: string | null;
    highlights: {
        title: string;
        detail: string;
        sources: string[];
        url?: string | undefined;
    }[];
    sourceCoverage: {
        source: string;
        sourceId: string;
        articleCount: number;
        reputationWeight: number;
    }[];
    notes: string[];
}, {
    summary: string;
    articleCount: number;
    generatedAt: string;
    windowStart: string;
    windowEnd: string;
    windowHours: number;
    highlights: {
        title: string;
        detail: string;
        sources: string[];
        url?: string | undefined;
    }[];
    sourceCoverage: {
        source: string;
        sourceId: string;
        articleCount: number;
        reputationWeight: number;
    }[];
    notes: string[];
    model?: string | null | undefined;
    aiError?: string | null | undefined;
}>;
export type NewsSummaryResponse = z.infer<typeof NewsSummaryResponseSchema>;
export declare const PriceQuoteSchema: z.ZodObject<{
    symbol: z.ZodString;
    usd: z.ZodNumber;
    usd24hChange: z.ZodOptional<z.ZodNumber>;
    fetchedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    symbol: string;
    usd: number;
    fetchedAt: string;
    usd24hChange?: number | undefined;
}, {
    symbol: string;
    usd: number;
    fetchedAt: string;
    usd24hChange?: number | undefined;
}>;
export type PriceQuote = z.infer<typeof PriceQuoteSchema>;
export declare const PriceResponseSchema: z.ZodObject<{
    quotes: z.ZodArray<z.ZodObject<{
        symbol: z.ZodString;
        usd: z.ZodNumber;
        usd24hChange: z.ZodOptional<z.ZodNumber>;
        fetchedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        symbol: string;
        usd: number;
        fetchedAt: string;
        usd24hChange?: number | undefined;
    }, {
        symbol: string;
        usd: number;
        fetchedAt: string;
        usd24hChange?: number | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    quotes: {
        symbol: string;
        usd: number;
        fetchedAt: string;
        usd24hChange?: number | undefined;
    }[];
}, {
    quotes: {
        symbol: string;
        usd: number;
        fetchedAt: string;
        usd24hChange?: number | undefined;
    }[];
}>;
export type PriceResponse = z.infer<typeof PriceResponseSchema>;
export type FetchHeadlinesParams = {
    limit: number;
    retentionDays: number;
};
export interface NewsProvider {
    readonly name: string;
    fetchHeadlines(params: FetchHeadlinesParams): Promise<NewsItem[]>;
}
export type FetchPricesParams = {
    symbols: string[];
};
export interface PriceProvider {
    readonly name: string;
    fetchPrices(params: FetchPricesParams): Promise<PriceQuote[]>;
}
//# sourceMappingURL=index.d.ts.map