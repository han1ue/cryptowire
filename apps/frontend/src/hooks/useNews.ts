import { useQuery } from "@tanstack/react-query";
import { fetchNews } from "@/lib/apiClient";

export const useNews = (params?: { limit?: number; retentionDays?: number }) => {
    return useQuery({
        queryKey: ["news", params?.limit ?? null, params?.retentionDays ?? null],
        queryFn: () => fetchNews(params),
        staleTime: 60_000,
        refetchInterval: 180_000,
        retry: 1,
    });
};
