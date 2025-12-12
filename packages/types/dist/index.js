import { z } from "zod";
export const NewsItemSchema = z.object({
    id: z.string(),
    title: z.string(),
    summary: z.string().default(""),
    url: z.string().url().optional(),
    source: z.string(),
    category: z.string().default("News"),
    publishedAt: z.string(),
    imageUrl: z.string().url().optional(),
});
export const NewsListResponseSchema = z.object({
    items: z.array(NewsItemSchema),
});
export const PriceQuoteSchema = z.object({
    symbol: z.string(),
    usd: z.number(),
    usd24hChange: z.number().optional(),
    fetchedAt: z.string(),
});
export const PriceResponseSchema = z.object({
    quotes: z.array(PriceQuoteSchema),
});
