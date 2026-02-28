import { useQuery } from "@tanstack/react-query";
import { fetchNewsCategories } from "@/lib/apiClient";

export const useNewsCategories = (params?: { sources?: string[] }) => {
    const enabled = (params?.sources?.length ?? 0) > 0;
    return useQuery({
        queryKey: ["news-categories", (params?.sources ?? []).join(",")],
        queryFn: () => fetchNewsCategories(params),
        enabled,
        staleTime: 5 * 60_000,
        retry: 1,
    });
};
