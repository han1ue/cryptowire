import type { PriceProvider, FetchPricesParams, PriceQuote } from "@cryptowire/types";
export declare class CoinGeckoPriceProvider implements PriceProvider {
    readonly name = "CoinGecko";
    fetchPrices(params: FetchPricesParams): Promise<PriceQuote[]>;
}
//# sourceMappingURL=coingeckoPrices.d.ts.map