import type { PriceQuote } from "@cryptowire/types";
import type { PriceProvider } from "@cryptowire/types";
import { CoinGeckoPriceProvider } from "@cryptowire/adapters";
import type { PriceStore } from "../stores/priceStore.js";

export class PriceService {
    private readonly provider: PriceProvider;

    constructor(
        private readonly store: PriceStore,
        provider?: PriceProvider,
    ) {
        this.provider = provider ?? new CoinGeckoPriceProvider();
    }

    private normalizeSymbols(symbols: string[]): string[] {
        return Array.from(
            new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean)),
        ).sort((a, b) => a.localeCompare(b));
    }

    async getStoredPrices(params: { symbols: string[] }): Promise<PriceQuote[]> {
        const symbols = this.normalizeSymbols(params.symbols);
        if (symbols.length === 0) return [];

        const all = await this.store.getAll();
        if (all.length === 0) return [];

        const requested = new Set(symbols);
        return all.filter((quote) => requested.has(quote.symbol.trim().toUpperCase()));
    }

    async refreshPrices(params: { symbols: string[] }): Promise<PriceQuote[]> {
        const symbols = this.normalizeSymbols(params.symbols);
        if (symbols.length === 0) return [];

        const quotes = await this.provider.fetchPrices({ symbols });

        if (quotes.length > 0) {
            const existing = await this.store.getAll();
            const bySymbol = new Map<string, PriceQuote>();

            for (const quote of existing) {
                bySymbol.set(quote.symbol.trim().toUpperCase(), quote);
            }
            for (const quote of quotes) {
                bySymbol.set(quote.symbol.trim().toUpperCase(), quote);
            }

            await this.store.putAll(Array.from(bySymbol.values()));
        }

        return this.getStoredPrices({ symbols });
    }

    async getStatus(): Promise<{ lastRefreshAt: string | null; quoteCount: number }> {
        return this.store.getStatus();
    }
}
