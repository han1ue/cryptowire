import { useQuery } from "@tanstack/react-query";
import { fetchNewsCategories } from "@/lib/apiClient";

export const useNewsCategories = (params?: { sources?: string[] }) => {
    return useQuery({
        queryKey: ["news-categories", (params?.sources ?? []).join(",")],
        queryFn: () => fetchNewsCategories(params),
        staleTime: 5 * 60_000,
        retry: 1,
    });
};
