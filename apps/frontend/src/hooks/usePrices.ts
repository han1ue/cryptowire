import { useQuery } from "@tanstack/react-query";
import { fetchPrices } from "@/lib/apiClient";

export const usePrices = (symbols: string[]) => {
    return useQuery({
        queryKey: ["prices", symbols.join(",")],
        queryFn: () => fetchPrices(symbols),
        staleTime: 15_000,
        refetchInterval: 30_000,
        retry: 1,
    });
};
