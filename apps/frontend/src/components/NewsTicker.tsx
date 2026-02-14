
import { Zap } from "lucide-react";
import { useNews } from "@/hooks/useNews";
import { useRecentArticles } from "@/hooks/useRecentArticles";
import { useEffect, useMemo, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

type NewsTickerProps = {
  sources: string[];
};

type Headline = {
  title: string;
  url?: string;
};

const fallbackHeadlines: Headline[] = [
  { title: "Bitcoin surges past $97K as institutional demand grows" },
  { title: "SEC approves spot Ethereum ETF applications from major asset managers" },
  { title: "Solana DEX volume hits all-time high amid memecoin frenzy" },
  { title: "Federal Reserve signals dovish stance, crypto markets rally" },
  { title: "Major bank announces Bitcoin custody services for institutional clients" },
  { title: "Layer 2 solutions see record TVL as Ethereum gas fees spike" },
  { title: "Crypto exchange reports 300% increase in new user signups" },
  { title: "DeFi protocol suffers $50M exploit, investigation ongoing" },
];

export const NewsTicker = ({ sources }: NewsTickerProps) => {
  const { data, isLoading } = useNews({ limit: 30, sources });
  const { addRecent } = useRecentArticles();

  const hasData = Boolean(data?.items && data.items.length > 0);
  const showSkeleton = isLoading && !hasData;

  const nextHeadlines = useMemo<Headline[]>(
    () => data?.items?.slice(0, 8).map((n) => ({ title: n.title, url: n.url })) ?? fallbackHeadlines,
    [data?.items],
  );

  const [headlines, setHeadlines] = useState<Headline[]>(nextHeadlines);
  const pendingRef = useRef<Headline[] | null>(null);
  const hydratedFromApiRef = useRef(false);

  useEffect(() => {
    if (!hasData) return;

    // First successful load: swap immediately so users see real (clickable) headlines.
    if (!hydratedFromApiRef.current) {
      hydratedFromApiRef.current = true;
      pendingRef.current = null;
      setHeadlines(nextHeadlines);
      return;
    }

    // Subsequent refreshes: defer to animation boundary to avoid visible jumps.
    pendingRef.current = nextHeadlines;
  }, [hasData, nextHeadlines]);

  const applyPendingAtLoopBoundary = () => {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    setHeadlines(pending);
  };

  if (showSkeleton) {
    return (
      <div className="bg-muted/30 border-b border-border overflow-hidden">
        <div className="flex items-center">
          <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border-r border-border shrink-0">
            <Zap className="h-3 w-3 text-terminal-amber pulse-glow" />
            <span className="hidden sm:inline text-xs font-medium text-terminal-amber uppercase tracking-wider">
              Breaking
            </span>
          </div>
          <div className="overflow-hidden flex-1">
            <div className="flex items-center gap-4 px-4 py-2">
              <Skeleton className="h-3 w-64" />
              <Skeleton className="h-3 w-56" />
              <Skeleton className="h-3 w-72" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 border-b border-border overflow-hidden">
      <div className="flex items-center">
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border-r border-border shrink-0">
          <Zap className="h-3 w-3 text-terminal-amber pulse-glow" />
          <span className="hidden sm:inline text-xs font-medium text-terminal-amber uppercase tracking-wider">
            Breaking
          </span>
        </div>
        <div className="overflow-hidden flex-1">
          <div
            className="ticker-scroll items-center py-2 whitespace-nowrap"
            onAnimationIteration={applyPendingAtLoopBoundary}
          >
            {[...headlines, ...headlines].map((headline, i) => (
              headline.url ? (
                <a
                  key={i}
                  href={headline.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  tabIndex={0}
                  onClick={() => {
                    addRecent({
                      title: headline.title,
                      url: headline.url,
                    });
                  }}
                >
                  {headline.title}
                  <span className="mx-4 text-border">│</span>
                </a>
              ) : (
                <span
                  key={i}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {headline.title}
                  <span className="mx-4 text-border">│</span>
                </span>
              )
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
