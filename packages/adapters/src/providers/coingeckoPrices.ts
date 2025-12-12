import type { PriceProvider, FetchPricesParams, PriceQuote } from "@cryptowire/types";

const SYMBOL_TO_ID: Record<string, string> = {
    BTC: "bitcoin",
    ETH: "ethereum",
    SOL: "solana",
    BNB: "binancecoin",
    XRP: "ripple",
    ADA: "cardano",
    DOGE: "dogecoin",
    AVAX: "avalanche-2",
};

export class CoinGeckoPriceProvider implements PriceProvider {
    public readonly name = "CoinGecko";

    async fetchPrices(params: FetchPricesParams): Promise<PriceQuote[]> {
        const ids = params.symbols
            .map((s) => s.trim().toUpperCase())
            .map((s) => SYMBOL_TO_ID[s])
            .filter(Boolean);

        if (ids.length === 0) return [];

        const url = new URL("https://api.coingecko.com/api/v3/simple/price");
        url.searchParams.set("ids", ids.join(","));
        url.searchParams.set("vs_currencies", "usd");
        url.searchParams.set("include_24hr_change", "true");

        const res = await fetch(url.toString(), {
            headers: { Accept: "application/json" },
        });

        if (!res.ok) return [];

        const data = (await res.json()) as Record<string, { usd?: number; usd_24h_change?: number }>;
        const fetchedAt = new Date().toISOString();

        const idToSymbol = Object.fromEntries(
            Object.entries(SYMBOL_TO_ID).map(([sym, id]) => [id, sym]),
        ) as Record<string, string>;

        const quotes: PriceQuote[] = [];

        for (const [id, row] of Object.entries(data)) {
            const symbol = idToSymbol[id] ?? id.toUpperCase();
            if (typeof row.usd !== "number") continue;

            const quote: PriceQuote = {
                symbol,
                usd: row.usd,
                fetchedAt,
            };

            if (typeof row.usd_24h_change === "number") {
                quote.usd24hChange = row.usd_24h_change;
            }

            quotes.push(quote);
        }

        return quotes;
    }
}
