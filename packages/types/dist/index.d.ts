import { z } from "zod";
export declare const NewsItemSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    summary: z.ZodDefault<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    source: z.ZodString;
    category: z.ZodDefault<z.ZodString>;
    publishedAt: z.ZodString;
    imageUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    title: string;
    summary: string;
    source: string;
    category: string;
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
    category?: string | undefined;
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
        category: z.ZodDefault<z.ZodString>;
        publishedAt: z.ZodString;
        imageUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        title: string;
        summary: string;
        source: string;
        category: string;
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
        category?: string | undefined;
        imageUrl?: string | undefined;
    }>, "many">;
    sources: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
    }, {
        id: string;
        name: string;
    }>, "many">;
    defaultSources: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    items: {
        id: string;
        title: string;
        summary: string;
        source: string;
        category: string;
        publishedAt: string;
        url?: string | undefined;
        imageUrl?: string | undefined;
    }[];
    sources: {
        id: string;
        name: string;
    }[];
    defaultSources: string[];
}, {
    items: {
        id: string;
        title: string;
        source: string;
        publishedAt: string;
        summary?: string | undefined;
        url?: string | undefined;
        category?: string | undefined;
        imageUrl?: string | undefined;
    }[];
    sources: {
        id: string;
        name: string;
    }[];
    defaultSources: string[];
}>;
export type NewsListResponse = z.infer<typeof NewsListResponseSchema>;
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