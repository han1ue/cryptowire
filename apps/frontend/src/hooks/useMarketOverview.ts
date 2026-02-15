import { useQuery } from "@tanstack/react-query";

type MarketOverviewResponse = {
    ok: true;
    overview: {
        marketCapUsd: number;
        marketCapChange24hPct: number;
        volume24hUsd: number;
        btcDominancePct: number;
        updatedAt: number;
        fearGreed: {
            value: number;
            classification: string;
            timestamp: number;
        };
    };
};

const getApiBaseUrl = (): string => {
    const configured = import.meta.env.VITE_API_BASE_URL as string | undefined;
    if (configured && typeof configured === "string" && configured.trim().length > 0) {
        return configured.replace(/\/+$/, "");
    }
    return window.location.origin;
};

const fetchMarketOverview = async (): Promise<MarketOverviewResponse> => {
    const url = new URL("/market", getApiBaseUrl());
    const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("Failed to fetch market overview");
    return (await res.json()) as MarketOverviewResponse;
};

export const useMarketOverview = () => {
    return useQuery({
        queryKey: ["market-overview"],
        queryFn: fetchMarketOverview,
        staleTime: 30_000,
        refetchInterval: 60_000,
        retry: 1,
    });
};
