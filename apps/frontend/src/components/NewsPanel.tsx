import { RefreshCw, Maximize2 } from "lucide-react";
import { NewsCard } from "./NewsCard";

interface NewsPanelProps {
  source: string;
  sourceIcon: string;
  news: Array<{
    title: string;
    summary: string;
    time: string;
    category: string;
    isBreaking?: boolean;
  }>;
}

export const NewsPanel = ({ source, sourceIcon, news }: NewsPanelProps) => {
  return (
    <div className="flex flex-col h-full bg-card/30 border border-border">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <span className="text-lg">{sourceIcon}</span>
          <h2 className="text-sm font-medium text-foreground uppercase tracking-wider">
            {source}
          </h2>
          <span className="px-1.5 py-0.5 text-[10px] bg-terminal-green/20 text-terminal-green uppercase">
            Live
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1 hover:bg-muted rounded transition-colors">
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </button>
          <button className="p-1 hover:bg-muted rounded transition-colors">
            <Maximize2 className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      </div>

      {/* News Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {news.map((item, index) => (
          <NewsCard
            key={index}
            title={item.title}
            summary={item.summary}
            source={source}
            time={item.time}
            category={item.category}
            isBreaking={item.isBreaking}
          />
        ))}
      </div>

      {/* Panel Footer */}
      <div className="px-4 py-2 border-t border-border bg-muted/10">
        <span className="text-[10px] text-muted-foreground">
          Last updated: <span className="text-terminal-green">Just now</span>
        </span>
      </div>
    </div>
  );
};
