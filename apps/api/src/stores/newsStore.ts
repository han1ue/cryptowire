import type { NewsItem } from "@cryptowire/types";
import { NewsItemSchema } from "@cryptowire/types";

export type NewsPageParams = {
    limit: number;
    offset: number;
};

export interface NewsStore {
    putMany(items: NewsItem[]): Promise<void>;
    getPage(params: NewsPageParams): Promise<NewsItem[]>;
    count(): Promise<number>;
    pruneOlderThan(isoCutoff: string): Promise<void>;
}

class InMemoryNewsStore implements NewsStore {
    private items: NewsItem[] = [];

    async putMany(items: NewsItem[]): Promise<void> {
        const byId = new Map(this.items.map((x) => [x.id, x] as const));
        for (const item of items) byId.set(item.id, item);
        this.items = Array.from(byId.values()).sort((a, b) => (a.publishedAt > b.publishedAt ? -1 : 1));
    }

    async getPage(params: NewsPageParams): Promise<NewsItem[]> {
        return this.items.slice(params.offset, params.offset + params.limit);
    }

    async count(): Promise<number> {
        return this.items.length;
    }

    async pruneOlderThan(isoCutoff: string): Promise<void> {
        this.items = this.items.filter((x) => x.publishedAt >= isoCutoff);
    }
}

export const createNewsStore = (): NewsStore => {
    // Vercel KV (Redis) support. If env isn't present, fall back to in-memory.
    const hasKv = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
    if (!hasKv) return new InMemoryNewsStore();

    // Lazy import to avoid bundling issues when KV isn't configured.
    const KV_NEWS_ZSET_KEY = "news:z";
    const KV_ITEM_KEY_PREFIX = "news:item:";

    const kvStore: NewsStore = {
        async putMany(items: NewsItem[]): Promise<void> {
            const { kv } = await import("@vercel/kv");

            // Store each item body with a TTL so it naturally expires.
            // The index is pruned separately via `pruneOlderThan`.
            const itemTtlSeconds = 7 * 24 * 60 * 60;

            for (const item of items) {
                const score = new Date(item.publishedAt).getTime();
                if (!Number.isFinite(score)) continue;

                const itemKey = `${KV_ITEM_KEY_PREFIX}${item.id}`;
                await kv.set(itemKey, item, { ex: itemTtlSeconds });
                await kv.zadd(KV_NEWS_ZSET_KEY, { score, member: item.id });
            }
        },

        async getPage(params: NewsPageParams): Promise<NewsItem[]> {
            const { kv } = await import("@vercel/kv");
            const start = params.offset;
            const stop = params.offset + params.limit - 1;

            // @vercel/kv (Upstash) doesn't expose a separate `zrevrange` helper;
            // use `zrange` with the `rev` option to read most-recent-first.
            const ids = (await kv.zrange(KV_NEWS_ZSET_KEY, start, stop, { rev: true })) as string[];
            if (!ids || ids.length === 0) return [];

            const keys = ids.map((id) => `${KV_ITEM_KEY_PREFIX}${id}`);
            const rows = (await kv.mget(...keys)) as Array<unknown | null>;
            const parsed: NewsItem[] = [];
            for (const row of rows) {
                if (!row) continue;

                const validated = NewsItemSchema.safeParse(row);
                if (validated.success) parsed.push(validated.data);
            }
            // Keep consistent ordering (most recent first)
            parsed.sort((a, b) => (a.publishedAt > b.publishedAt ? -1 : 1));
            return parsed;
        },

        async count(): Promise<number> {
            const { kv } = await import("@vercel/kv");
            const c = await kv.zcard(KV_NEWS_ZSET_KEY);
            return typeof c === "number" ? c : 0;
        },

        async pruneOlderThan(isoCutoff: string): Promise<void> {
            const { kv } = await import("@vercel/kv");
            const cutoffScore = new Date(isoCutoff).getTime();
            if (!Number.isFinite(cutoffScore)) return;

            // Remove old IDs from the index in a single operation.
            // Item bodies expire naturally via per-item TTL.
            await kv.zremrangebyscore(KV_NEWS_ZSET_KEY, "-inf", cutoffScore);
        },
    };

    return kvStore;
};
