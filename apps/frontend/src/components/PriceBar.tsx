import { TrendingUp, TrendingDown } from "lucide-react";

interface PriceData {
  symbol: string;
  price: string;
  change: number;
}

const prices: PriceData[] = [
  { symbol: "BTC", price: "97,432.18", change: 2.34 },
  { symbol: "ETH", price: "3,891.45", change: -1.23 },
  { symbol: "SOL", price: "234.67", change: 5.67 },
  { symbol: "BNB", price: "712.89", change: 0.45 },
  { symbol: "XRP", price: "2.34", change: -0.89 },
  { symbol: "ADA", price: "1.12", change: 3.21 },
  { symbol: "DOGE", price: "0.42", change: -2.45 },
  { symbol: "AVAX", price: "45.67", change: 1.89 },
];

export const PriceBar = () => {
  return (
    <div className="border-b border-border bg-card/50 overflow-hidden">
      <div className="flex items-center gap-6 px-4 py-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wider shrink-0">
          Live Prices
        </span>
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
          {prices.map((item) => (
            <div key={item.symbol} className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-medium text-foreground">
                {item.symbol}
              </span>
              <span className="text-xs text-muted-foreground">
                ${item.price}
              </span>
              <span
                className={`flex items-center gap-0.5 text-xs ${
                  item.change >= 0 ? "text-terminal-green" : "text-terminal-red"
                }`}
              >
                {item.change >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(item.change)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
