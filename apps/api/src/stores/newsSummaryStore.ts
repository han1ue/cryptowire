import fs from "node:fs/promises";
import path from "node:path";
import type { NewsSummaryResponse } from "@cryptowire/types";
import { NewsSummaryResponseSchema } from "@cryptowire/types";

export interface NewsSummaryStore {
    getLatest(): Promise<NewsSummaryResponse | null>;
    putLatest(summary: NewsSummaryResponse): Promise<void>;
}

type NewsSummaryStoreOptions = {
    filePath?: string;
};

const KV_SUMMARY_KEY = "news:summary:latest";
const DEFAULT_FILE_RELATIVE_PATH = "data/news-summary-latest.json";

const parseSummary = (raw: unknown): NewsSummaryResponse | null => {
    const parsed = NewsSummaryResponseSchema.safeParse(raw);
    if (!parsed.success) return null;
    return parsed.data;
};

export const createNewsSummaryStore = (options?: NewsSummaryStoreOptions): NewsSummaryStore => {
    const kvEnabled = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
    const configuredPath = options?.filePath?.trim();
    let latestMemory: NewsSummaryResponse | null = null;

    const summaryFilePath = (() => {
        if (!configuredPath) return path.join(process.cwd(), DEFAULT_FILE_RELATIVE_PATH);
        if (path.isAbsolute(configuredPath)) return configuredPath;
        return path.join(process.cwd(), configuredPath);
    })();

    const readFromFile = async (): Promise<NewsSummaryResponse | null> => {
        try {
            const text = await fs.readFile(summaryFilePath, "utf8");
            if (!text.trim()) return null;
            const raw = JSON.parse(text) as unknown;
            return parseSummary(raw);
        } catch {
            return null;
        }
    };

    const writeToFile = async (summary: NewsSummaryResponse): Promise<void> => {
        try {
            await fs.mkdir(path.dirname(summaryFilePath), { recursive: true });
            await fs.writeFile(summaryFilePath, JSON.stringify(summary, null, 2), "utf8");
        } catch {
            // ignore: in serverless read-only filesystems we rely on KV fallback.
        }
    };

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
            const fromFile = await readFromFile();
            if (fromFile) {
                latestMemory = fromFile;
                return fromFile;
            }

            const fromKv = await readFromKv();
            if (fromKv) {
                latestMemory = fromKv;
                return fromKv;
            }

            return latestMemory;
        },

        async putLatest(summary: NewsSummaryResponse): Promise<void> {
            latestMemory = summary;
            await writeToFile(summary);
            await writeToKv(summary);
        },
    };
};
