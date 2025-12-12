type CacheEntry<T> = {
    value: T;
    expiresAt: number;
};

export class SimpleTtlCache {
    private readonly store = new Map<string, CacheEntry<unknown>>();

    get<T>(key: string): T | null {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return null;
        }
        return entry.value as T;
    }

    /**
     * Returns cached value even if expired, plus a stale flag.
     * Useful for stale-while-revalidate patterns.
     */
    getWithStale<T>(key: string): { value: T; isStale: boolean } | null {
        const entry = this.store.get(key);
        if (!entry) return null;
        const isStale = Date.now() > entry.expiresAt;
        return { value: entry.value as T, isStale };
    }

    set<T>(key: string, value: T, ttlMs: number) {
        this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    }
}
