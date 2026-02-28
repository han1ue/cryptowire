import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchNews } from "@/lib/apiClient";

export const useInfiniteNews = (params?: { pageSize?: number; retentionDays?: number; sources?: string[]; category?: string }) => {
    const pageSize = params?.pageSize ?? 25;
    const enabled = (params?.sources?.length ?? 0) > 0;

    return useInfiniteQuery({
        queryKey: [
            "news-infinite",
            pageSize,
            params?.retentionDays ?? null,
            (params?.sources ?? []).join(","),
            params?.category ?? null,
        ],
        initialPageParam: undefined as string | undefined,
        queryFn: ({ pageParam }) =>
            fetchNews({
                limit: pageSize,
                retentionDays: params?.retentionDays,
                sources: params?.sources,
                category: params?.category,
                cursor: typeof pageParam === "string" ? pageParam : undefined,
            }),
        getNextPageParam: (lastPage) => {
            if (!lastPage.items || lastPage.items.length < pageSize) return undefined;
            return lastPage.items[lastPage.items.length - 1]?.id;
        },
        enabled,
        staleTime: 60_000,
        retry: 1,
    });
};
