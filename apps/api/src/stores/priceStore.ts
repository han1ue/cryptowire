import { PriceQuoteSchema, type PriceQuote } from "@cryptowire/types";
import { z } from "zod";

export interface PriceStore {
    getAll(): Promise<PriceQuote[]>;
    putAll(quotes: PriceQuote[]): Promise<void>;
}

const KV_PRICES_KEY = "prices:latest";
const PriceQuoteListSchema = z.array(PriceQuoteSchema);

const normalizeQuotes = (quotes: PriceQuote[]): PriceQuote[] => {
    const bySymbol = new Map<string, PriceQuote>();

    for (const quote of quotes) {
        const symbol = quote.symbol.trim().toUpperCase();
        if (!symbol) continue;
        bySymbol.set(symbol, { ...quote, symbol });
    }

    return Array.from(bySymbol.values()).sort((a, b) => a.symbol.localeCompare(b.symbol));
};

const parseQuoteList = (raw: unknown): PriceQuote[] | null => {
    let candidate: unknown = raw;

    if (typeof candidate === "string") {
        try {
            candidate = JSON.parse(candidate) as unknown;
        } catch {
            return null;
        }
    }

    const parsed = PriceQuoteListSchema.safeParse(candidate);
    if (!parsed.success) return null;
    return normalizeQuotes(parsed.data);
};

export const createPriceStore = (): PriceStore => {
    const kvEnabled = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
    let latestMemory: PriceQuote[] = [];

    return {
        async getAll(): Promise<PriceQuote[]> {
            if (!kvEnabled) return latestMemory;

            try {
                const { kv } = await import("@vercel/kv");
                const raw = await kv.get(KV_PRICES_KEY);
                const parsed = parseQuoteList(raw);
                if (!parsed) return latestMemory;
                latestMemory = parsed;
                return parsed;
            } catch {
                return latestMemory;
            }
        },

        async putAll(quotes: PriceQuote[]): Promise<void> {
            const normalized = normalizeQuotes(quotes);
            latestMemory = normalized;

            if (!kvEnabled) return;

            try {
                const { kv } = await import("@vercel/kv");
                await kv.set(KV_PRICES_KEY, JSON.stringify(normalized), { ex: 7 * 24 * 60 * 60 });
            } catch {
                // ignore
            }
        },
    };
};
