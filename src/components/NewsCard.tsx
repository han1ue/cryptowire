import { Clock, ExternalLink, Tag, Bookmark } from "lucide-react";

interface NewsCardProps {
  title: string;
  summary: string;
  source: string;
  time: string;
  category: string;
  url?: string;
  isBreaking?: boolean;
  isSaved?: boolean;
  onToggleSave?: () => void;
}

export const NewsCard = ({
  title,
  summary,
  source,
  time,
  category,
  url,
  isBreaking,
  isSaved,
  onToggleSave,
}: NewsCardProps) => {
  return (
    <article
      className="group p-4 bg-card border border-border hover:border-primary/30 transition-all duration-200 cursor-pointer terminal-glow flex flex-col h-full"
      onClick={() => {
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        {isBreaking && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-terminal-red/20 text-terminal-red uppercase tracking-wider">
            Breaking
          </span>
        )}
        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary uppercase tracking-wider">
          {category}
        </span>
        <span className="text-[10px] text-muted-foreground uppercase">
          {source}
        </span>
      </div>

      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
          onClick={e => e.stopPropagation()}
        >
          <h3 className="text-sm font-medium text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
            {title}
          </h3>
        </a>
      ) : (
        <h3 className="text-sm font-medium text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
          {title}
        </h3>
      )}

      <p className="text-xs text-muted-foreground mb-3 line-clamp-2 flex-grow">
        {summary}
      </p>

      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {time}
        </div>
        <div className="flex items-center gap-2">
          {onToggleSave && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave();
              }}
              className="transition-colors"
            >
              <Bookmark
                className={`h-3 w-3 ${isSaved
                  ? "fill-primary text-primary"
                  : "text-muted-foreground hover:text-primary"
                  }`}
              />
            </button>
          )}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
};
