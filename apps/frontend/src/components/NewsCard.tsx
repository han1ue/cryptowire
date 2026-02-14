import { Clock, Bookmark, Share2 } from "lucide-react";
import { ShareMenu } from "@/components/ShareMenu";
import { isUrlVisited, markUrlVisited } from "@/lib/visitedLinks";
import { useRecentArticles } from "@/hooks/useRecentArticles";
import { useMemo, useState } from "react";

interface NewsCardProps {
  title: string;
  summary: string;
  source: string;
  time: string;
  category?: string;
  categories?: string[];
  url?: string;
  isBreaking?: boolean;
  isSaved?: boolean;
  onToggleSave?: () => void;
  onOpen?: () => void;
  onCategoryClick?: (category: string) => void;
  disableVisitedStyling?: boolean;
}

export const NewsCard = ({
  title,
  summary,
  source,
  time,
  category,
  categories,
  url,
  isBreaking,
  isSaved,
  onToggleSave,
  onOpen,
  onCategoryClick,
  disableVisitedStyling,
}: NewsCardProps) => {
  const EXCLUDED_CATEGORY = "cryptocurrency";
  const visited = !disableVisitedStyling && url ? isUrlVisited(url) : false;
  const { addRecent } = useRecentArticles();
  const [showAllCategories, setShowAllCategories] = useState(false);

  const recordRecent = () => {
    if (!url) return;
    addRecent({
      title,
      url,
      source,
      summary,
      category,
    });
  };

  const effectiveTags = useMemo(() => {
    const tags = Array.isArray(categories)
      ? categories
        .map((c) => (typeof c === "string" ? c.trim() : ""))
        .filter((c) => c.length > 0 && c.toLowerCase() !== EXCLUDED_CATEGORY)
      : [];
    const deduped = Array.from(new Set(tags));
    if (deduped.length > 0) return deduped;
    if (category && category.trim().length > 0 && category.trim().toLowerCase() !== EXCLUDED_CATEGORY) {
      return [category.trim()];
    }
    return ["News"];
  }, [categories, category]);
  const visibleTags = showAllCategories ? effectiveTags : effectiveTags.slice(0, 3);
  const hiddenTagCount = Math.max(0, effectiveTags.length - visibleTags.length);

  return (
    <article
      className="hover-group hover-border p-3 sm:p-4 bg-card border border-border transition-all duration-200 cursor-pointer terminal-glow flex flex-col h-full"
      onClick={() => {
        if (onOpen) return onOpen();
        if (url) {
          recordRecent();
          markUrlVisited(url);
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        {isBreaking && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-terminal-red/20 text-terminal-red uppercase tracking-wider">
            Breaking
          </span>
        )}
        {visibleTags.map((tag) => (
          <button
            key={tag}
            type="button"
            className="px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary uppercase tracking-wider"
            onClick={(e) => {
              e.stopPropagation();
              onCategoryClick?.(tag);
            }}
            title={`Filter by ${tag}`}
          >
            {tag}
          </button>
        ))}
        {hiddenTagCount > 0 ? (
          <button
            type="button"
            className="px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary uppercase tracking-wider"
            onClick={(e) => {
              e.stopPropagation();
              setShowAllCategories(true);
            }}
            title={`Show ${hiddenTagCount} more categories`}
          >
            +{hiddenTagCount}
          </button>
        ) : null}
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
          onClick={(e) => {
            e.stopPropagation();
            recordRecent();
            markUrlVisited(url);
          }}
        >
          <h3
            className={`hover-title text-sm font-medium mb-2 transition-colors line-clamp-2 cw-title ${visited ? "cw-title--visited" : ""}`}
          >
            {title}
          </h3>
        </a>
      ) : (
        <h3 className="hover-title text-sm font-medium mb-2 transition-colors line-clamp-2 cw-title">
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
          {url && (
            <ShareMenu url={url} title={title}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="transition-colors"
                title="Share article"
              >
                <Share2 className="h-5 w-5 text-muted-foreground hover:text-primary" />
              </button>
            </ShareMenu>
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
