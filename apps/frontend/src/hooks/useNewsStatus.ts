import { useQuery } from "@tanstack/react-query";
import { fetchNewsStatus } from "@/lib/apiClient";

export const useNewsStatus = () => {
    return useQuery({
        queryKey: ["news-status"],
        queryFn: () => fetchNewsStatus(),
        staleTime: 30_000,
        refetchInterval: 60_000,
        retry: 1,
    });
};
