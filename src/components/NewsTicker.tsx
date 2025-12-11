
import { Zap } from "lucide-react";
import { sources } from "@/data/mockNews";

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

const buildHeadlines = (): Headline[] => {
  const latestNews = sources
    .flatMap(source => source.news)
    .map(news => ({ title: news.title, url: news.url }))
    .slice(0, 8);

  if (latestNews.length > 0) {
    return latestNews;
  }

  return fallbackHeadlines;
};

const headlines = buildHeadlines();

export const NewsTicker = () => {
  return (
    <div className="bg-muted/30 border-b border-border overflow-hidden">
      <div className="flex items-center">
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border-r border-border shrink-0">
          <Zap className="h-3 w-3 text-terminal-amber pulse-glow" />
          <span className="text-xs font-medium text-terminal-amber uppercase tracking-wider">
            Breaking
          </span>
        </div>
        <div className="overflow-hidden flex-1">
          <div className="ticker-scroll flex items-center py-2 whitespace-nowrap">
            {[...headlines, ...headlines].map((headline, i) => (
              headline.url ? (
                <a
                  key={i}
                  href={headline.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  tabIndex={0}
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
