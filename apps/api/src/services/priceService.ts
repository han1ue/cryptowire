import type { PriceQuote } from "@cryptowire/types";
import type { PriceProvider } from "@cryptowire/types";
import { CoinGeckoPriceProvider } from "@cryptowire/adapters";
import { SimpleTtlCache } from "../lib/cache.js";
import type { AppConfig } from "../config.js";

const PRICE_CACHE_TTL_MS = 5 * 60 * 1000;

export class PriceService {
    private readonly cache = new SimpleTtlCache();
    private readonly provider: PriceProvider;

    constructor(private readonly config: AppConfig) {
        this.provider = new CoinGeckoPriceProvider();
    }

    async getPrices(params: { symbols: string[] }): Promise<PriceQuote[]> {
        const symbols = params.symbols.map((s) => s.trim().toUpperCase()).filter(Boolean);
        const cacheKey = `prices:${symbols.join(",")}`;

        const cached = this.cache.get<PriceQuote[]>(cacheKey);
        if (cached) return cached;

        const quotes = await this.provider.fetchPrices({ symbols });
        this.cache.set(cacheKey, quotes, PRICE_CACHE_TTL_MS);
        return quotes;
    }
}
