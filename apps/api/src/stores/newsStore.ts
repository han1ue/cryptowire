import type { NewsItem } from "@cryptowire/types";
import { NewsItemSchema } from "@cryptowire/types";

export type NewsPageParams = {
    limit: number;
    offset: number;
};

export interface NewsStore {
    putMany(items: NewsItem[]): Promise<void>;
    getPage(params: NewsPageParams): Promise<NewsItem[]>;
    getById(id: string): Promise<NewsItem | null>;
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

    async getById(id: string): Promise<NewsItem | null> {
        const found = this.items.find((x) => x.id === id);
        return found ?? null;
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
    const KV_NEWS_HASH_KEY = "news:h";

    const kvStore: NewsStore = {
        async putMany(items: NewsItem[]): Promise<void> {
            const { kv } = await import("@vercel/kv");

            // Store bodies in a single hash and index IDs in a single zset.
            // This keeps KV command usage low (one HSET + one ZADD per refresh batch).
            const bodyById: Record<string, NewsItem> = {};
            const scoreMembers: Array<{ score: number; member: string }> = [];

            for (const item of items) {
                const id = String(item.id ?? "").trim();
                if (!id) continue;
                const score = new Date(item.publishedAt).getTime();
                if (!Number.isFinite(score)) continue;
                bodyById[id] = item;
                scoreMembers.push({ score, member: id });
            }

            if (Object.keys(bodyById).length > 0) {
                await kv.hset(KV_NEWS_HASH_KEY, bodyById);
            }
            if (scoreMembers.length > 0) {
                await kv.zadd(KV_NEWS_ZSET_KEY, scoreMembers[0]!, ...scoreMembers.slice(1));
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

            const raw = (await kv.hmget<Record<string, unknown>>(KV_NEWS_HASH_KEY, ...ids)) as unknown;
            const rows: Array<unknown | null> = Array.isArray(raw)
                ? (raw as Array<unknown | null>)
                : raw && typeof raw === "object"
                    ? ids.map((id) => (raw as Record<string, unknown>)[id] ?? null)
                    : [];

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

        async getById(id: string): Promise<NewsItem | null> {
            const { kv } = await import("@vercel/kv");
            const row = await kv.hget(KV_NEWS_HASH_KEY, id);
            const validated = NewsItemSchema.safeParse(row);
            return validated.success ? validated.data : null;
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

            // Remove old IDs from the index and delete their bodies from the hash.
            const oldIds = (await kv.zrange(KV_NEWS_ZSET_KEY, "-inf", cutoffScore, { byScore: true })) as string[];
            if (oldIds && oldIds.length > 0) {
                // Chunk to avoid very large argument lists.
                const chunkSize = 500;
                for (let i = 0; i < oldIds.length; i += chunkSize) {
                    const chunk = oldIds.slice(i, i + chunkSize);
                    await kv.hdel(KV_NEWS_HASH_KEY, ...chunk);
                }
            }
            await kv.zremrangebyscore(KV_NEWS_ZSET_KEY, "-inf", cutoffScore);
        },
    };

    return kvStore;
};
