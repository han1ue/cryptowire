import { z } from "zod";
export * from "./sources.js";

export const NewsItemSchema = z.object({
    id: z.string(),
    title: z.string(),
    summary: z.string().default(""),
    url: z.string().url().optional(),
    source: z.string(),
    categories: z.array(z.string().min(1)).min(1).default(["News"]),
    publishedAt: z.string(),
    imageUrl: z.string().url().optional(),
});

export type NewsItem = z.infer<typeof NewsItemSchema>;

export const NewsSourceSchema = z.object({
    id: z.string(),
    name: z.string(),
});

export type NewsSource = z.infer<typeof NewsSourceSchema>;

export const NewsListResponseSchema = z.object({
    items: z.array(NewsItemSchema),
});

export type NewsListResponse = z.infer<typeof NewsListResponseSchema>;

export const NewsCategoriesResponseSchema = z.object({
    categories: z.array(z.string()),
});

export type NewsCategoriesResponse = z.infer<typeof NewsCategoriesResponseSchema>;

export const PriceQuoteSchema = z.object({
    symbol: z.string(),
    usd: z.number(),
    usd24hChange: z.number().optional(),
    fetchedAt: z.string(),
});

export type PriceQuote = z.infer<typeof PriceQuoteSchema>;

export const PriceResponseSchema = z.object({
    quotes: z.array(PriceQuoteSchema),
});

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
