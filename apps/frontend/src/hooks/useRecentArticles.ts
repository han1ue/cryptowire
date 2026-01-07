import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "recentArticles";
const EVENT_NAME = "recent-articles-updated";
const MAX_RECENTS = 100;

export type RecentArticle = {
    key: string;
    title: string;
    url?: string;
    source?: string;
    summary?: string;
    category?: string;
    clickedAt: string;
};

export type AddRecentInput = {
    id?: string;
    title: string;
    url?: string;
    source?: string;
    summary?: string;
    category?: string;
};

const toKey = (input: { id?: string; url?: string; title: string }): string => {
    const url = (input.url ?? "").trim();
    if (url) return `url:${url}`;
    const id = (input.id ?? "").trim();
    if (id) return `id:${id}`;
    return `title:${input.title.trim().toLowerCase()}`;
};

const readRecents = (): RecentArticle[] => {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        const out: RecentArticle[] = [];
        for (const row of parsed as unknown[]) {
            if (!row || typeof row !== "object") continue;
            const r = row as Record<string, unknown>;
            const title = typeof r.title === "string" ? r.title : "";
            if (!title.trim()) continue;

            const url = typeof r.url === "string" ? r.url : undefined;
            const key = toKey({
                id: typeof r.id === "string" ? r.id : undefined,
                url,
                title,
            });

            const clickedAt = typeof r.clickedAt === "string" && r.clickedAt ? r.clickedAt : new Date().toISOString();

            out.push({
                key,
                title,
                url,
                source: typeof r.source === "string" ? r.source : undefined,
                summary: typeof r.summary === "string" ? r.summary : undefined,
                category: typeof r.category === "string" ? r.category : undefined,
                clickedAt,
            });
        }

        const seen = new Set<string>();
        const deduped = out.filter((a) => {
            if (seen.has(a.key)) return false;
            seen.add(a.key);
            return true;
        });

        return deduped.slice(0, MAX_RECENTS);
    } catch {
        return [];
    }
};

const writeRecents = (next: RecentArticle[]) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, MAX_RECENTS)));
    window.dispatchEvent(new Event(EVENT_NAME));
};

export const useRecentArticles = () => {
    const [recentArticles, setRecentArticles] = useState<RecentArticle[]>(() => readRecents());

    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key && e.key !== STORAGE_KEY) return;
            setRecentArticles(readRecents());
        };
        const onCustom = () => setRecentArticles(readRecents());

        window.addEventListener("storage", onStorage);
        window.addEventListener(EVENT_NAME, onCustom);
        return () => {
            window.removeEventListener("storage", onStorage);
            window.removeEventListener(EVENT_NAME, onCustom);
        };
    }, []);

    const addRecent = useCallback((input: AddRecentInput) => {
        const normalized = {
            key: toKey({ id: input.id, url: input.url, title: input.title }),
            title: input.title,
            url: input.url,
            source: input.source,
            summary: input.summary,
            category: input.category,
            clickedAt: new Date().toISOString(),
        } satisfies RecentArticle;

        setRecentArticles((prev) => {
            const next = [normalized, ...prev.filter((a) => a.key !== normalized.key)].slice(0, MAX_RECENTS);
            writeRecents(next);
            return next;
        });
    }, []);

    return useMemo(() => ({ recentArticles, addRecent }), [recentArticles, addRecent]);
};
