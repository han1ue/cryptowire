import type { NewsListResponse, PriceResponse } from "@cryptowire/types";

export const fetchNews = async (params?: { limit?: number; retentionDays?: number; offset?: number }): Promise<NewsListResponse> => {
    const url = new URL("/api/news", window.location.origin);
    if (params?.limit) url.searchParams.set("limit", String(params.limit));
    if (params?.retentionDays) url.searchParams.set("retentionDays", String(params.retentionDays));
    if (typeof params?.offset === "number") url.searchParams.set("offset", String(params.offset));

    const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("Failed to fetch news");
    return (await res.json()) as NewsListResponse;
};

export const fetchPrices = async (symbols?: string[]): Promise<PriceResponse> => {
    const url = new URL("/api/prices", window.location.origin);
    if (symbols && symbols.length > 0) url.searchParams.set("symbols", symbols.join(","));

    const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("Failed to fetch prices");
    return (await res.json()) as PriceResponse;
};
