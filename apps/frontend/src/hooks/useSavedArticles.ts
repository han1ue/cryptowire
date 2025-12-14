import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "@/components/ui/sonner";

const STORAGE_KEY = "savedArticles";
const EVENT_NAME = "saved-articles-updated";

const readSaved = (): string[] => {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map((x) => String(x)) : [];
    } catch {
        return [];
    }
};

const writeSaved = (next: string[]) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT_NAME));
};

export const useSavedArticles = () => {
    const [savedTitles, setSavedTitles] = useState<string[]>(() => readSaved());

    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key && e.key !== STORAGE_KEY) return;
            setSavedTitles(readSaved());
        };
        const onCustom = () => setSavedTitles(readSaved());

        window.addEventListener("storage", onStorage);
        window.addEventListener(EVENT_NAME, onCustom);
        return () => {
            window.removeEventListener("storage", onStorage);
            window.removeEventListener(EVENT_NAME, onCustom);
        };
    }, []);

    const isSaved = useCallback(
        (title: string) => savedTitles.includes(title),
        [savedTitles]
    );

    const toggleSaved = useCallback((title: string) => {
        setSavedTitles((prev) => {
            const next = prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title];
            writeSaved(next);
            toast(prev.includes(title) ? "Removed from saved articles" : "Added to saved articles");
            return next;
        });
    }, []);

    return useMemo(
        () => ({ savedTitles, isSaved, toggleSaved }),
        [savedTitles, isSaved, toggleSaved]
    );
};
