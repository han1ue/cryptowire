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
export const NewsSourceSchema = z.object({
    id: z.string(),
    name: z.string(),
});
export const NewsListResponseSchema = z.object({
    items: z.array(NewsItemSchema),
    sources: z.array(NewsSourceSchema),
});
export const ArticleSchema = z.object({
    id: z.string(),
    url: z.string().url().nullable(),
    title: z.string(),
    source: z.string(),
    category: z.string(),
    publishedAt: z.string(),
    imageUrl: z.string().url().optional(),
    excerpt: z.string().nullable().optional(),
    byline: z.string().nullable().optional(),
    siteName: z.string().nullable().optional(),
    contentHtml: z.string().nullable(),
    textContent: z.string().nullable(),
});
export const ArticleResponseSchema = z.object({
    ok: z.literal(true),
    article: ArticleSchema,
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
