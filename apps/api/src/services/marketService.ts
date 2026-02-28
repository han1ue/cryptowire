import { z } from "zod";
import { SimpleTtlCache } from "../lib/cache.js";

const MARKET_OVERVIEW_CACHE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_MARKET_UPSTREAM_TIMEOUT_MS = 12_000;

type FetchLike = typeof fetch;

const CoinGeckoGlobalSchema = z
    .object({
        data: z.object({
            total_market_cap: z.object({ usd: z.number() }),
            total_volume: z.object({ usd: z.number() }),
            market_cap_percentage: z.object({ btc: z.number() }),
            market_cap_change_percentage_24h_usd: z.number(),
            updated_at: z.number(),
        }),
    })
    .passthrough();

const AlternativeMeFngSchema = z
    .object({
        data: z
            .array(
                z
                    .object({
                        value: z.string(),
                        value_classification: z.string(),
                        timestamp: z.string(),
                        time_until_update: z.string().optional(),
                    })
                    .passthrough(),
            )
            .min(1),
    })
    .passthrough();

export type MarketOverview = {
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

export class MarketService {
    private readonly cache = new SimpleTtlCache();

    constructor(
        private readonly fetchImpl: FetchLike = fetch,
        private readonly upstreamTimeoutMs: number = DEFAULT_MARKET_UPSTREAM_TIMEOUT_MS,
    ) {
    }

    private async fetchJsonWithTimeout(url: string, label: string): Promise<unknown> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.upstreamTimeoutMs);

        try {
            const response = await this.fetchImpl(url, {
                headers: { Accept: "application/json" },
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error(`${label} failed: ${response.status}`);
            }

            return await response.json();
        } catch (error: unknown) {
            if (error instanceof Error && error.name === "AbortError") {
                throw new Error(`${label} timed out after ${this.upstreamTimeoutMs}ms`);
            }
            if (error instanceof Error) throw error;
            throw new Error(`${label} request failed`);
        } finally {
            clearTimeout(timeout);
        }
    }

    async getMarketOverview(): Promise<MarketOverview> {
        const cacheKey = "market:overview:v1";
        const cached = this.cache.get<MarketOverview>(cacheKey);
        if (cached) return cached;

        const [globalRaw, fngRaw] = await Promise.all([
            this.fetchJsonWithTimeout("https://api.coingecko.com/api/v3/global", "CoinGecko global"),
            this.fetchJsonWithTimeout("https://api.alternative.me/fng/", "Alternative.me fng"),
        ]);

        const globalParsed = CoinGeckoGlobalSchema.safeParse(globalRaw);
        if (!globalParsed.success) {
            throw new Error("CoinGecko global invalid response shape");
        }

        const fngParsed = AlternativeMeFngSchema.safeParse(fngRaw);
        if (!fngParsed.success) {
            throw new Error("Alternative.me fng invalid response shape");
        }

        const g = globalParsed.data.data;
        const f0 = fngParsed.data.data[0];

        const out: MarketOverview = {
            marketCapUsd: g.total_market_cap.usd,
            marketCapChange24hPct: g.market_cap_change_percentage_24h_usd,
            volume24hUsd: g.total_volume.usd,
            btcDominancePct: g.market_cap_percentage.btc,
            updatedAt: g.updated_at,
            fearGreed: {
                value: Number(f0.value),
                classification: f0.value_classification,
                timestamp: Number(f0.timestamp),
            },
        };

        // Cache to align with frontend polling cadence.
        this.cache.set(cacheKey, out, MARKET_OVERVIEW_CACHE_TTL_MS);
        return out;
    }
}
