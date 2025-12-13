import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchNews } from "@/lib/apiClient";

export const useInfiniteNews = (params?: { pageSize?: number; retentionDays?: number; sources?: string[]; category?: string }) => {
    const pageSize = params?.pageSize ?? 25;

    return useInfiniteQuery({
        queryKey: [
            "news-infinite",
            pageSize,
            params?.retentionDays ?? null,
            (params?.sources ?? []).join(","),
            params?.category ?? null,
        ],
        initialPageParam: 0,
        queryFn: ({ pageParam }) =>
            fetchNews({
                limit: pageSize,
                retentionDays: params?.retentionDays,
                sources: params?.sources,
                category: params?.category,
                offset: typeof pageParam === "number" ? pageParam : 0,
            }),
        getNextPageParam: (lastPage, allPages) => {
            const loaded = allPages.reduce((sum, p) => sum + (p.items?.length ?? 0), 0);
            if (!lastPage.items || lastPage.items.length < pageSize) return undefined;
            return loaded;
        },
        staleTime: 60_000,
        retry: 1,
    });
};
