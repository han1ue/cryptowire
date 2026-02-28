import type { NewsSummaryResponse } from "@cryptowire/types";
import { NewsSummaryResponseSchema } from "@cryptowire/types";

export interface NewsSummaryStore {
    getLatest(): Promise<NewsSummaryResponse | null>;
    putLatest(summary: NewsSummaryResponse): Promise<void>;
}

const KV_SUMMARY_KEY = "news:summary:latest";

const parseSummary = (raw: unknown): NewsSummaryResponse | null => {
    const parsed = NewsSummaryResponseSchema.safeParse(raw);
    if (!parsed.success) return null;
    return parsed.data;
};

class InMemoryNewsSummaryStore implements NewsSummaryStore {
    private latest: NewsSummaryResponse | null = null;

    async getLatest(): Promise<NewsSummaryResponse | null> {
        return this.latest;
    }

    async putLatest(summary: NewsSummaryResponse): Promise<void> {
        this.latest = summary;
    }
}

export const createNewsSummaryStore = (): NewsSummaryStore => {
    const hasKv = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
    if (!hasKv) return new InMemoryNewsSummaryStore();

    const kvStore: NewsSummaryStore = {
        async getLatest(): Promise<NewsSummaryResponse | null> {
            const { kv } = await import("@vercel/kv");
            const raw = await kv.get(KV_SUMMARY_KEY);

            if (typeof raw === "string") {
                try {
                    return parseSummary(JSON.parse(raw) as unknown);
                } catch {
                    return null;
                }
            }

            return parseSummary(raw);
        },

        async putLatest(summary: NewsSummaryResponse): Promise<void> {
            const { kv } = await import("@vercel/kv");
            // Keep around for one week.
            await kv.set(KV_SUMMARY_KEY, JSON.stringify(summary), { ex: 7 * 24 * 60 * 60 });
        },
    };

    return kvStore;
};
