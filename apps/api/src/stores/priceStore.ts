import { PriceQuoteSchema, type PriceQuote } from "@cryptowire/types";
import { z } from "zod";

export interface PriceStore {
    getAll(): Promise<PriceQuote[]>;
    putAll(quotes: PriceQuote[]): Promise<void>;
    getStatus(): Promise<{ lastRefreshAt: string | null; quoteCount: number }>;
}

const KV_PRICES_KEY = "prices:latest";
const KV_PRICES_LAST_REFRESH_KEY = "prices:lastRefreshAt";
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

class InMemoryPriceStore implements PriceStore {
    private latest: PriceQuote[] = [];
    private lastRefreshAt: string | null = null;

    async getAll(): Promise<PriceQuote[]> {
        return this.latest;
    }

    async putAll(quotes: PriceQuote[]): Promise<void> {
        this.latest = normalizeQuotes(quotes);
        this.lastRefreshAt = new Date().toISOString();
    }

    async getStatus(): Promise<{ lastRefreshAt: string | null; quoteCount: number }> {
        return {
            lastRefreshAt: this.lastRefreshAt,
            quoteCount: this.latest.length,
        };
    }
}

export const createPriceStore = (): PriceStore => {
    const hasKv = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
    if (!hasKv) return new InMemoryPriceStore();

    const kvStore: PriceStore = {
        async getAll(): Promise<PriceQuote[]> {
            const { kv } = await import("@vercel/kv");
            const raw = await kv.get(KV_PRICES_KEY);
            const parsed = parseQuoteList(raw);
            return parsed ?? [];
        },

        async putAll(quotes: PriceQuote[]): Promise<void> {
            const normalized = normalizeQuotes(quotes);
            const { kv } = await import("@vercel/kv");
            const refreshedAt = new Date().toISOString();
            await Promise.all([
                kv.set(KV_PRICES_KEY, JSON.stringify(normalized), { ex: 7 * 24 * 60 * 60 }),
                kv.set(KV_PRICES_LAST_REFRESH_KEY, refreshedAt, { ex: 7 * 24 * 60 * 60 }),
            ]);
        },

        async getStatus(): Promise<{ lastRefreshAt: string | null; quoteCount: number }> {
            const { kv } = await import("@vercel/kv");
            const [rawQuotes, rawRefreshAt] = await Promise.all([
                kv.get(KV_PRICES_KEY),
                kv.get(KV_PRICES_LAST_REFRESH_KEY),
            ]);
            const quotes = parseQuoteList(rawQuotes) ?? [];
            const lastRefreshAt = typeof rawRefreshAt === "string" && rawRefreshAt.trim().length > 0
                ? rawRefreshAt
                : null;
            return {
                lastRefreshAt,
                quoteCount: quotes.length,
            };
        },
    };

    return kvStore;
};
