import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

const MARKET_OVERVIEW_REFRESH_MS = 10 * 60 * 1000;
const MARKET_OVERVIEW_INITIAL_DELAY_MS = 3 * 60 * 1000;

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
    const [refetchIntervalMs, setRefetchIntervalMs] = useState<number | false>(false);

    useEffect(() => {
        const timer = window.setTimeout(
            () => setRefetchIntervalMs(MARKET_OVERVIEW_REFRESH_MS),
            MARKET_OVERVIEW_INITIAL_DELAY_MS,
        );
        return () => window.clearTimeout(timer);
    }, []);

    return useQuery({
        queryKey: ["market-overview"],
        queryFn: fetchMarketOverview,
        staleTime: MARKET_OVERVIEW_REFRESH_MS,
        refetchInterval: refetchIntervalMs,
        retry: 1,
    });
};
