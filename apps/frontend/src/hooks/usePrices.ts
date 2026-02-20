import { useQuery } from "@tanstack/react-query";
import { fetchPrices } from "@/lib/apiClient";

const PRICE_REFRESH_MS = 5 * 60 * 1000;

export const usePrices = (symbols: string[]) => {
    return useQuery({
        queryKey: ["prices", symbols.join(",")],
        queryFn: () => fetchPrices(symbols),
        staleTime: PRICE_REFRESH_MS,
        refetchInterval: PRICE_REFRESH_MS,
        retry: 1,
    });
};
