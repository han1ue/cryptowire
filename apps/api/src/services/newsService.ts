import type { NewsItem } from "@cryptowire/types";
import type { NewsProvider } from "@cryptowire/types";
import { CoindeskNewsProvider } from "@cryptowire/adapters";
import { SimpleTtlCache } from "../lib/cache.js";
import type { AppConfig } from "../config.js";

export class NewsService {
    private readonly cache = new SimpleTtlCache();
    private readonly inflight = new Map<string, Promise<NewsItem[]>>();

    constructor(private readonly config: AppConfig) {
    }

    private createProviders(params?: { sourceIds?: string }): NewsProvider[] {
        return [
            new CoindeskNewsProvider({
                apiKey: this.config.COINDESK_API_KEY,
                baseUrl: this.config.COINDESK_BASE_URL,
                endpointPath: this.config.COINDESK_NEWS_ENDPOINT_PATH,
                sourceIds: params?.sourceIds,
            }),
        ];
    }

    private async fetchAndCache(params: {
        cacheKey: string;
        limit: number;
        retentionDays: number;
        sourceIds?: string;
    }): Promise<NewsItem[]> {
        const existing = this.inflight.get(params.cacheKey);
        if (existing) return existing;

        const task = (async () => {
            const providers = this.createProviders({ sourceIds: params.sourceIds });
            const perProviderLimit = Math.max(1, Math.ceil(params.limit / Math.max(1, providers.length)));

            const lists = await Promise.all(
                providers.map((p) =>
                    p.fetchHeadlines({
                        limit: perProviderLimit,
                        retentionDays: params.retentionDays,
                    }),
                ),
            );

            const merged = lists
                .flat()
                .sort((a, b) => (a.publishedAt > b.publishedAt ? -1 : 1))
                .slice(0, params.limit);

            this.cache.set(params.cacheKey, merged, this.config.NEWS_CACHE_TTL_SECONDS * 1000);
            return merged;
        })();

        this.inflight.set(params.cacheKey, task);
        try {
            return await task;
        } finally {
            this.inflight.delete(params.cacheKey);
        }
    }

    async listHeadlines(params: { limit: number; retentionDays?: number; sourceIds?: string }): Promise<NewsItem[]> {
        const retentionDays = params.retentionDays ?? this.config.NEWS_RETENTION_DAYS;

        const sourceKey = (params.sourceIds ?? "").trim() || "__all__";
        const cacheKey = `news:${params.limit}:${retentionDays}:${sourceKey}`;
        const cached = this.cache.getWithStale<NewsItem[]>(cacheKey);
        if (cached && !cached.isStale) return cached.value;

        // Serve stale data immediately, and refresh in the background.
        if (cached && cached.isStale) {
            void this.fetchAndCache({ cacheKey, limit: params.limit, retentionDays, sourceIds: params.sourceIds }).catch(() => {
                // Best-effort background refresh; keep serving stale until next success.
            });
            return cached.value;
        }

        // Cold start: no cache yet.
        return await this.fetchAndCache({ cacheKey, limit: params.limit, retentionDays, sourceIds: params.sourceIds });
    }

    async refreshHeadlines(params: { limit: number; retentionDays?: number; force?: boolean; sourceIds?: string }): Promise<NewsItem[]> {
        const retentionDays = params.retentionDays ?? this.config.NEWS_RETENTION_DAYS;
        const sourceKey = (params.sourceIds ?? "").trim() || "__all__";
        const cacheKey = `news:${params.limit}:${retentionDays}:${sourceKey}`;

        if (!params.force) {
            // Warm using normal behavior (may be cached).
            return await this.listHeadlines({ limit: params.limit, retentionDays, sourceIds: params.sourceIds });
        }

        return await this.fetchAndCache({ cacheKey, limit: params.limit, retentionDays, sourceIds: params.sourceIds });
    }
}
