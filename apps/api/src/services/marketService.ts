import { z } from "zod";
import { SimpleTtlCache } from "../lib/cache.js";

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

    async getMarketOverview(): Promise<MarketOverview> {
        const cacheKey = "market:overview:v1";
        const cached = this.cache.get<MarketOverview>(cacheKey);
        if (cached) return cached;

        const [globalResp, fngResp] = await Promise.all([
            fetch("https://api.coingecko.com/api/v3/global", {
                headers: { Accept: "application/json" },
            }),
            fetch("https://api.alternative.me/fng/", {
                headers: { Accept: "application/json" },
            }),
        ]);

        if (!globalResp.ok) {
            throw new Error(`CoinGecko global failed: ${globalResp.status}`);
        }
        if (!fngResp.ok) {
            throw new Error(`Alternative.me fng failed: ${fngResp.status}`);
        }

        const globalRaw: unknown = await globalResp.json();
        const fngRaw: unknown = await fngResp.json();

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

        // Cache briefly to avoid hammering upstream from every client.
        this.cache.set(cacheKey, out, 60_000);
        return out;
    }
}
