import { Clock, Bookmark, Share2 } from "lucide-react";

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
  showSchemaButton?: boolean;
  onShowSchema?: () => void;
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
  showSchemaButton,
  onShowSchema,
}: NewsCardProps) => {
  return (
    <article
      className="group p-3 sm:p-4 bg-card border border-border hover:border-primary/30 transition-all duration-200 cursor-pointer terminal-glow flex flex-col h-full"
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
        <div className="flex items-center gap-1 text-[10px]">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-news-time">{time}</span>
        </div>
        <div className="flex items-center gap-3">
          {showSchemaButton && onShowSchema && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowSchema();
              }}
              className="transition-colors"
              title="Show news item schema"
            >
              <span className="text-[10px] text-muted-foreground hover:text-primary">schema</span>
            </button>
          )}
          {url && (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (navigator.share) {
                  try {
                    await navigator.share({ title, url });
                  } catch { }
                } else {
                  await navigator.clipboard.writeText(url);
                  if (typeof window !== 'undefined' && window.dispatchEvent) {
                    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Link copied to clipboard' } }));
                  }
                }
              }}
              className="transition-colors"
              title="Share article"
            >
              <Share2 className="h-5 w-5 text-muted-foreground hover:text-primary" />
            </button>
          )}
          {onToggleSave && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave();
              }}
              className="transition-colors"
              title={isSaved ? "Remove from saved" : "Save article"}
            >
              <Bookmark
                className={`h-5 w-5 ${isSaved
                  ? "fill-primary text-primary"
                  : "text-muted-foreground hover:text-primary"
                  }`}
              />
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
