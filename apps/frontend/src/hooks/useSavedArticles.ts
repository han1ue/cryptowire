import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "@/components/ui/sonner";

const STORAGE_KEY = "savedArticles";
const EVENT_NAME = "saved-articles-updated";

export type SavedArticle = {
    key: string;
    title: string;
    url?: string;
    publishedAt?: string;
    source?: string;
    summary?: string;
    category?: string;
    savedAt: string;
};

type ToggleSavedInput = {
    id?: string;
    title: string;
    url?: string;
    publishedAt?: string;
    source?: string;
    summary?: string;
    category?: string;
};

const toKey = (input: { id?: string; url?: string; title: string; publishedAt?: string }): string => {
    // Prefer URL as the primary key since it stays stable across views.
    const url = (input.url ?? "").trim();
    if (url) return `url:${url}`;
    const id = (input.id ?? "").trim();
    if (id) return `id:${id}`;
    const publishedAt = (input.publishedAt ?? "").trim();
    return `title:${input.title.trim().toLowerCase()}@${publishedAt}`;
};

const normalizeToggleInput = (input: ToggleSavedInput): Omit<SavedArticle, "savedAt"> => {
    return {
        key: toKey({ id: input.id, url: input.url, title: input.title, publishedAt: input.publishedAt }),
        title: input.title,
        url: input.url,
        publishedAt: input.publishedAt,
        source: input.source,
        summary: input.summary,
        category: input.category,
    };
};

const readSaved = (): SavedArticle[] => {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        const out: SavedArticle[] = [];
        let shouldRewriteStorage = false;
        for (const row of parsed as unknown[]) {
            if (!row || typeof row !== "object") continue;
            const r = row as Record<string, unknown>;
            const title = typeof r.title === "string" ? r.title : "";
            if (!title.trim()) continue;
            const savedAt = typeof r.savedAt === "string" && r.savedAt ? r.savedAt : new Date().toISOString();

            const url = typeof r.url === "string" ? r.url : undefined;
            const publishedAt = typeof r.publishedAt === "string" ? r.publishedAt : undefined;
            const canonicalKey = toKey({
                id: typeof r.id === "string" ? r.id : undefined,
                url,
                title,
                publishedAt,
            });

            const storedKey = typeof r.key === "string" && r.key ? r.key : undefined;
            if (storedKey && storedKey !== canonicalKey) shouldRewriteStorage = true;

            out.push({
                key: canonicalKey,
                title,
                url,
                publishedAt,
                source: typeof r.source === "string" ? r.source : undefined,
                summary: typeof r.summary === "string" ? r.summary : undefined,
                category: typeof r.category === "string" ? r.category : undefined,
                savedAt,
            });
        }

        // De-dupe by key preserving order.
        const seen = new Set<string>();
        const deduped = out.filter((a) => {
            if (seen.has(a.key)) return false;
            seen.add(a.key);
            return true;
        });

        if (deduped.length !== out.length) shouldRewriteStorage = true;
        if (shouldRewriteStorage) {
            // Rewrite without dispatching the custom event to avoid loops.
            localStorage.setItem(STORAGE_KEY, JSON.stringify(deduped));
        }

        return deduped;
    } catch {
        return [];
    }
};

const writeSaved = (next: SavedArticle[]) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT_NAME));
};

export const useSavedArticles = () => {
    const [savedArticles, setSavedArticles] = useState<SavedArticle[]>(() => readSaved());

    useEffect(() => {
        if (!import.meta.env.DEV) return;
        // Visible in browser DevTools (Console).
        console.debug(`[cryptowi.re] savedArticles in localStorage: ${savedArticles.length}`);
    }, [savedArticles.length]);

    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key && e.key !== STORAGE_KEY) return;
            setSavedArticles(readSaved());
        };
        const onCustom = () => setSavedArticles(readSaved());

        window.addEventListener("storage", onStorage);
        window.addEventListener(EVENT_NAME, onCustom);
        return () => {
            window.removeEventListener("storage", onStorage);
            window.removeEventListener(EVENT_NAME, onCustom);
        };
    }, []);

    const savedTitles = useMemo(() => savedArticles.map((a) => a.title), [savedArticles]);
    const savedKeys = useMemo(() => new Set(savedArticles.map((a) => a.key)), [savedArticles]);
    const savedTitleSet = useMemo(() => new Set(savedTitles), [savedTitles]);

    const isSaved = useCallback(
        (titleOrKey: string) => {
            // UI commonly checks by title.
            if (savedTitleSet.has(titleOrKey)) return true;
            if (savedKeys.has(titleOrKey)) return true;
            return false;
        },
        [savedKeys, savedTitleSet],
    );

    const isSavedInput = useCallback(
        (input: ToggleSavedInput) => {
            const normalized = normalizeToggleInput(input);
            return savedKeys.has(normalized.key);
        },
        [savedKeys],
    );

    const toggleSaved = useCallback((input: ToggleSavedInput) => {
        const normalized = normalizeToggleInput(input);

        setSavedArticles((prev) => {
            const exists = prev.some((a) => a.key === normalized.key);

            const next = exists
                ? prev.filter((a) => a.key !== normalized.key)
                : [{ ...normalized, savedAt: new Date().toISOString() }, ...prev];

            writeSaved(next);
            toast(exists ? "Removed from saved articles" : "Added to saved articles");
            return next;
        });
    }, []);

    return useMemo(
        () => ({ savedArticles, savedTitles, isSaved, isSavedInput, toggleSaved }),
        [savedArticles, savedTitles, isSaved, isSavedInput, toggleSaved],
    );
};
