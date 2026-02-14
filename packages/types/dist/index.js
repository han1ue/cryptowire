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
export const NewsSourceSchema = z.object({
    id: z.string(),
    name: z.string(),
});
export const NewsListResponseSchema = z.object({
    items: z.array(NewsItemSchema),
});
export const NewsCategoriesResponseSchema = z.object({
    categories: z.array(z.string()),
});
export const NewsSummaryHighlightSchema = z.object({
    title: z.string(),
    detail: z.string(),
    sources: z.array(z.string()),
    url: z.string().url().optional(),
});
export const NewsSummarySourceCoverageSchema = z.object({
    sourceId: z.string(),
    source: z.string(),
    articleCount: z.number().int().nonnegative(),
    reputationWeight: z.number().min(0).max(1),
});
export const NewsSummaryResponseSchema = z.object({
    generatedAt: z.string(),
    windowStart: z.string(),
    windowEnd: z.string(),
    windowHours: z.number().int().positive(),
    articleCount: z.number().int().nonnegative(),
    model: z
        .string()
        .nullable()
        .optional()
        .transform((value) => {
        const trimmed = typeof value === "string" ? value.trim() : "";
        return trimmed.length > 0 ? trimmed : "unknown-model";
    }),
    aiError: z.string().nullable().default(null),
    summary: z.string(),
    highlights: z.array(NewsSummaryHighlightSchema),
    sourceCoverage: z.array(NewsSummarySourceCoverageSchema),
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
