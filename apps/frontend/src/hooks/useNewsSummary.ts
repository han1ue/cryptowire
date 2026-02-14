import { useQuery } from "@tanstack/react-query";
import { fetchNewsSummary } from "@/lib/apiClient";

export const useNewsSummary = (params?: {
    enabled?: boolean;
}) => {
    return useQuery({
        queryKey: ["news-summary", "daily"],
        queryFn: () => fetchNewsSummary(),
        staleTime: 5 * 60_000,
        retry: 1,
        enabled: params?.enabled ?? true,
    });
};
