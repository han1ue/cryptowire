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
}>;
export type NewsListResponse = z.infer<typeof NewsListResponseSchema>;
export declare const ArticleSchema: z.ZodObject<{
    id: z.ZodString;
    url: z.ZodNullable<z.ZodString>;
    title: z.ZodString;
    source: z.ZodString;
    category: z.ZodString;
    publishedAt: z.ZodString;
    imageUrl: z.ZodOptional<z.ZodString>;
    excerpt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    byline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    siteName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    contentHtml: z.ZodNullable<z.ZodString>;
    textContent: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    title: string;
    url: string | null;
    source: string;
    category: string;
    publishedAt: string;
    contentHtml: string | null;
    textContent: string | null;
    imageUrl?: string | undefined;
    excerpt?: string | null | undefined;
    byline?: string | null | undefined;
    siteName?: string | null | undefined;
}, {
    id: string;
    title: string;
    url: string | null;
    source: string;
    category: string;
    publishedAt: string;
    contentHtml: string | null;
    textContent: string | null;
    imageUrl?: string | undefined;
    excerpt?: string | null | undefined;
    byline?: string | null | undefined;
    siteName?: string | null | undefined;
}>;
export type Article = z.infer<typeof ArticleSchema>;
export declare const ArticleResponseSchema: z.ZodObject<{
    ok: z.ZodLiteral<true>;
    article: z.ZodObject<{
        id: z.ZodString;
        url: z.ZodNullable<z.ZodString>;
        title: z.ZodString;
        source: z.ZodString;
        category: z.ZodString;
        publishedAt: z.ZodString;
        imageUrl: z.ZodOptional<z.ZodString>;
        excerpt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        byline: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        siteName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        contentHtml: z.ZodNullable<z.ZodString>;
        textContent: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        title: string;
        url: string | null;
        source: string;
        category: string;
        publishedAt: string;
        contentHtml: string | null;
        textContent: string | null;
        imageUrl?: string | undefined;
        excerpt?: string | null | undefined;
        byline?: string | null | undefined;
        siteName?: string | null | undefined;
    }, {
        id: string;
        title: string;
        url: string | null;
        source: string;
        category: string;
        publishedAt: string;
        contentHtml: string | null;
        textContent: string | null;
        imageUrl?: string | undefined;
        excerpt?: string | null | undefined;
        byline?: string | null | undefined;
        siteName?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    ok: true;
    article: {
        id: string;
        title: string;
        url: string | null;
        source: string;
        category: string;
        publishedAt: string;
        contentHtml: string | null;
        textContent: string | null;
        imageUrl?: string | undefined;
        excerpt?: string | null | undefined;
        byline?: string | null | undefined;
        siteName?: string | null | undefined;
    };
}, {
    ok: true;
    article: {
        id: string;
        title: string;
        url: string | null;
        source: string;
        category: string;
        publishedAt: string;
        contentHtml: string | null;
        textContent: string | null;
        imageUrl?: string | undefined;
        excerpt?: string | null | undefined;
        byline?: string | null | undefined;
        siteName?: string | null | undefined;
    };
}>;
export type ArticleResponse = z.infer<typeof ArticleResponseSchema>;
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