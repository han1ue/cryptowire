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

export const createNewsSummaryStore = (): NewsSummaryStore => {
    const kvEnabled = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
    let latestMemory: NewsSummaryResponse | null = null;

    const readFromKv = async (): Promise<NewsSummaryResponse | null> => {
        if (!kvEnabled) return null;
        try {
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
        } catch {
            return null;
        }
    };

    const writeToKv = async (summary: NewsSummaryResponse): Promise<void> => {
        if (!kvEnabled) return;
        try {
            const { kv } = await import("@vercel/kv");
            // Keep around for one week.
            await kv.set(KV_SUMMARY_KEY, JSON.stringify(summary), { ex: 7 * 24 * 60 * 60 });
        } catch {
            // ignore
        }
    };

    return {
        async getLatest(): Promise<NewsSummaryResponse | null> {
            if (kvEnabled) {
                const fromKv = await readFromKv();
                if (fromKv) {
                    latestMemory = fromKv;
                    return fromKv;
                }
            }

            return latestMemory;
        },

        async putLatest(summary: NewsSummaryResponse): Promise<void> {
            latestMemory = summary;
            await writeToKv(summary);
        },
    };
};
