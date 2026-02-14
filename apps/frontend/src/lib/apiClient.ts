import type { NewsCategoriesResponse, NewsListResponse, NewsSummaryResponse, PriceResponse } from "@cryptowire/types";

const getApiBaseUrl = (): string => {
    const configured = import.meta.env.VITE_API_BASE_URL as string | undefined;
    if (configured && typeof configured === "string" && configured.trim().length > 0) {
        return configured.replace(/\/+$/, "");
    }
    return window.location.origin;
};

export const fetchNews = async (params?: {
    limit?: number;
    retentionDays?: number;
    offset?: number;
    sources?: string[];
    category?: string;
}): Promise<NewsListResponse> => {
    const url = new URL("/api/news", getApiBaseUrl());
    if (params?.limit) url.searchParams.set("limit", String(params.limit));
    if (params?.retentionDays) url.searchParams.set("retentionDays", String(params.retentionDays));
    if (typeof params?.offset === "number") url.searchParams.set("offset", String(params.offset));
    if (params?.sources && params.sources.length > 0) url.searchParams.set("sources", params.sources.join(","));
    if (params?.category && params.category.trim().length > 0) url.searchParams.set("category", params.category.trim());

    const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("Failed to fetch news");
    return (await res.json()) as NewsListResponse;
};

export const fetchNewsCategories = async (params?: { sources?: string[] }): Promise<NewsCategoriesResponse> => {
    const url = new URL("/api/news/categories", getApiBaseUrl());
    if (params?.sources && params.sources.length > 0) url.searchParams.set("sources", params.sources.join(","));

    const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("Failed to fetch categories");
    return (await res.json()) as NewsCategoriesResponse;
};

export const fetchNewsStatus = async (): Promise<{ lastRefreshAt: string | null; now: string }> => {
    const url = new URL("/api/news/status", getApiBaseUrl());
    const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("Failed to fetch news status");
    const json: unknown = await res.json();
    const record = json && typeof json === "object" ? (json as Record<string, unknown>) : null;
    return {
        lastRefreshAt: typeof record?.lastRefreshAt === "string" ? (record.lastRefreshAt as string) : null,
        now: typeof record?.now === "string" ? (record.now as string) : new Date().toISOString(),
    };
};

export const fetchNewsSummary = async (): Promise<NewsSummaryResponse> => {
    const url = new URL("/api/news/summary", getApiBaseUrl());

    const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("Failed to fetch AI summary");
    return (await res.json()) as NewsSummaryResponse;
};

export const fetchPrices = async (symbols?: string[]): Promise<PriceResponse> => {
    const url = new URL("/api/prices", getApiBaseUrl());
    if (symbols && symbols.length > 0) url.searchParams.set("symbols", symbols.join(","));

    const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("Failed to fetch prices");
    return (await res.json()) as PriceResponse;
};
