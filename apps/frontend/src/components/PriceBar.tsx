import { TrendingUp, TrendingDown } from "lucide-react";
import { usePrices } from "@/hooks/usePrices";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

export const PriceBar = () => {
  // Static market-cap order (checked once; not dynamic).
  const symbols = ["BTC", "ETH", "XRP", "BNB", "SOL", "DOGE", "ADA", "AVAX"];
  const { data, isLoading } = usePrices(symbols);

  const bySymbol = new Map(
    (data?.quotes ?? []).map((q) => [
      q.symbol,
      {
        symbol: q.symbol,
        price: q.usd.toLocaleString(undefined, { maximumFractionDigits: q.usd >= 1 ? 2 : 6 }),
        change: q.usd24hChange ?? 0,
      },
    ])
  );

  const hasQuotes = (data?.quotes?.length ?? 0) > 0;
  const showSkeleton = isLoading && !hasQuotes;

  const prices = symbols
    .map((sym) => bySymbol.get(sym) ?? { symbol: sym, price: "—", change: 0 })
    .filter(Boolean);

  return (
    <div className="border-b border-border bg-card/50 overflow-hidden">
      <div className="flex items-center">
        <TooltipProvider delayDuration={500}>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href="https://www.coingecko.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 border-r border-border shrink-0 cursor-pointer"
                aria-label="Live prices by CoinGecko"
              >
                <img
                  src="/CG-Symbol.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-3.5 w-3.5 pointer-events-none"
                />
                <span className="hidden sm:inline text-xs font-medium text-terminal-amber uppercase tracking-wider whitespace-nowrap pointer-events-none">
                  Live prices
                  <span className="hidden lg:inline text-muted-foreground normal-case tracking-normal font-normal">
                    {" "}
                    by CoinGecko
                  </span>
                </span>
              </a>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs pointer-events-none select-none">
              Live prices by CoinGecko
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex items-center gap-6 px-4 py-2 overflow-x-auto scrollbar-hide flex-1">
          {showSkeleton
            ? symbols.map((sym) => (
              <div key={sym} className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-medium text-foreground">{sym}</span>
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))
            : prices.map((item) => (
              <div key={item.symbol} className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-medium text-foreground">{item.symbol}</span>
                <span className="text-xs text-muted-foreground">{item.price === "—" ? "—" : `$${item.price}`}</span>
                <span
                  className={`flex items-center gap-0.5 text-xs ${item.change >= 0 ? "text-terminal-green" : "text-terminal-red"
                    }`}
                >
                  {item.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(item.change).toFixed(2)}%
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
