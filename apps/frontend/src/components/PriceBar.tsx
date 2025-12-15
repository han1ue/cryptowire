import { TrendingUp, TrendingDown } from "lucide-react";
import { usePrices } from "@/hooks/usePrices";

export const PriceBar = () => {
  // Static market-cap order (checked once; not dynamic).
  const symbols = ["BTC", "ETH", "XRP", "BNB", "SOL", "DOGE", "ADA", "AVAX"];
  const { data } = usePrices(symbols);

  const fallback = new Map(
    [
      { symbol: "BTC", price: "97,432.18", change: 2.34 },
      { symbol: "ETH", price: "3,891.45", change: -1.23 },
      { symbol: "XRP", price: "2.34", change: -0.89 },
      { symbol: "BNB", price: "712.89", change: 0.45 },
      { symbol: "SOL", price: "234.67", change: 5.67 },
      { symbol: "DOGE", price: "0.42", change: -2.45 },
      { symbol: "ADA", price: "1.12", change: 3.21 },
      { symbol: "AVAX", price: "45.67", change: 1.89 },
    ].map((x) => [x.symbol, x] as const)
  );

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

  const prices = symbols.map((sym) => bySymbol.get(sym) ?? fallback.get(sym)!).filter(Boolean);

  return (
    <div className="border-b border-border bg-card/50 overflow-hidden">
      <div className="flex items-center">
        <a
          href="https://www.coingecko.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-primary/10 border-r border-border shrink-0"
          style={{ cursor: 'pointer !important' }}
          aria-label="Live prices by CoinGecko"
          title="Live prices by CoinGecko"
        >
          <img
            src="/CG-Symbol.svg"
            alt=""
            aria-hidden="true"
            className="h-3.5 w-3.5"
            style={{ cursor: 'inherit' }}
          />
          <span className="text-xs font-medium text-terminal-amber uppercase tracking-wider whitespace-nowrap" style={{ cursor: 'inherit' }}>
            Live prices
            <span className="hidden lg:inline text-muted-foreground normal-case tracking-normal font-normal"> by CoinGecko</span>
          </span>
        </a>

        <div className="flex items-center gap-6 px-4 py-2 overflow-x-auto scrollbar-hide flex-1">
          {prices.map((item) => (
            <div key={item.symbol} className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-medium text-foreground">{item.symbol}</span>
              <span className="text-xs text-muted-foreground">${item.price}</span>
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
