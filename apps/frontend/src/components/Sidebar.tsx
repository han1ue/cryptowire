
import {
  BarChart3,
  Bookmark,
  Clock,
  Filter,
  ChevronDown,
  ChevronUp,
  Github,
  Rss
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useMarketOverview } from '@/hooks/useMarketOverview';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { useRecentArticles } from '@/hooks/useRecentArticles';
import type { SavedArticle } from '@/hooks/useSavedArticles';
import type { RecentArticle } from '@/hooks/useRecentArticles';

// Helper component for scrollable category list with dynamic gradient
function CategoryScrollWithDynamicGradient({
  categories,
  categorySearch,
  selectedCategory,
  onCategorySelect,
}: {
  categories: string[];
  categorySearch: string;
  selectedCategory: string;
  onCategorySelect: (cat: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showGradient, setShowGradient] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => {
      setShowGradient(
        el.scrollHeight > el.clientHeight &&
        el.scrollTop + el.clientHeight < el.scrollHeight - 2
      );
    };
    check();
    el.addEventListener('scroll', check);
    window.addEventListener('resize', check);
    return () => {
      el.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, [categories, categorySearch]);

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="space-y-1 max-h-64 overflow-y-auto scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {categories
          .filter((cat: string) =>
            cat.toLowerCase().includes(categorySearch.toLowerCase())
          )
          .map((cat: string) => (
            <button
              key={cat}
              className={`w-full flex items-center justify-between px-2 py-1.5 text-xs transition-colors ${selectedCategory === cat
                ? 'bg-primary/10 text-primary border-l-2 border-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                }`}
              onClick={() => onCategorySelect(cat)}
            >
              <span>{cat}</span>
            </button>
          ))}
      </div>
      {showGradient && (
        <div className="pointer-events-none absolute bottom-0 left-0 w-full h-10 bg-gradient-to-t from-card to-transparent" />
      )}
    </div>
  );
}

interface SidebarProps {
  savedArticlesCount?: number;
  showSavedOnly?: boolean;
  onToggleSavedView?: () => void;
  savedArticles?: SavedArticle[];
  recentArticlesCount?: number;
  recentArticles?: RecentArticle[];
  showRecentOnly?: boolean;
  onToggleRecentView?: () => void;
  allNews?: Array<{ title: string; time: string; sourceName: string; category?: string; url?: string }>;
  categories?: string[];
  selectedCategory?: string;
  onCategorySelect?: (cat: string) => void;
  onSourcesClick?: () => void;
  activeSourceCount?: number;
  totalSourceCount?: number;
  loadedArticlesCount?: number;
  appVersion?: string;
}

export const Sidebar = ({
  savedArticlesCount = 0,
  showSavedOnly = false,
  onToggleSavedView,
  savedArticles = [],
  recentArticlesCount = 0,
  recentArticles = [],
  showRecentOnly = false,
  onToggleRecentView,
  allNews = [],
  categories: categoriesProp,
  selectedCategory = 'All News',
  onCategorySelect = () => { },
  onSourcesClick = () => { },
  activeSourceCount = 0,
  totalSourceCount = 0,
  loadedArticlesCount = 0,
  appVersion = "1.2.0",
}: SidebarProps) => {
  const EXCLUDED_CATEGORY = "cryptocurrency";
  const { data: marketData, isLoading: marketLoading } = useMarketOverview();
  const { addRecent } = useRecentArticles();
  const [categoriesCollapsed, setCategoriesCollapsed] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  // Removed showMoreCategories and related logic; always show all filtered categories
  const savedArticlesPreviews = savedArticles
    .slice(0, 3)
    .map((a) => {
      const publishedAt = a.publishedAt ?? a.savedAt;
      return {
        title: a.title,
        url: a.url,
        sourceName: a.source ?? 'Saved',
        time: formatDistanceToNow(new Date(publishedAt), { addSuffix: true }).replace(/^about /, ''),
      };
    });

  const recentArticlesPreviews = recentArticles
    .slice(0, 3)
    .map((a) => {
      return {
        title: a.title,
        url: a.url,
        sourceName: a.source ?? 'Recent',
        time: formatDistanceToNow(new Date(a.clickedAt), { addSuffix: true }).replace(/^about /, ''),
      };
    });

  const providedCategories = Array.isArray(categoriesProp)
    ? categoriesProp
      .map((c) => String(c).trim())
      .filter((c) => c.length > 0 && c.toLowerCase() !== EXCLUDED_CATEGORY)
    : [];

  const categories = [
    "All News",
    ...Array.from(new Set(providedCategories)),
  ].sort((a, b) => {
    if (a === "All News") return -1;
    if (b === "All News") return 1;
    return a.localeCompare(b);
  });

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col h-full overflow-y-auto">
      {/* Quick Stats */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium uppercase tracking-wider text-foreground">
            Market Overview
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(() => {
            const o = marketData?.overview;

            const formatUsdCompact = (value: number): string => {
              const abs = Math.abs(value);
              const sign = value < 0 ? '-' : '';
              const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

              if (abs >= 1_000_000_000_000) return `${sign}$${fmt(abs / 1_000_000_000_000)}T`;
              if (abs >= 1_000_000_000) return `${sign}$${fmt(abs / 1_000_000_000)}B`;
              if (abs >= 1_000_000) return `${sign}$${fmt(abs / 1_000_000)}M`;
              if (abs >= 1_000) return `${sign}$${fmt(abs / 1_000)}K`;
              return `${sign}$${abs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
            };

            const fmtPct = (value: number) => {
              const rounded = Math.round(value * 10) / 10;
              const prefix = rounded > 0 ? '+' : '';
              return `${prefix}${rounded.toFixed(1)}%`;
            };
            const capChange = typeof o?.marketCapChange24hPct === 'number' ? o.marketCapChange24hPct : null;
            const capChangeClass = capChange === null
              ? 'text-muted-foreground'
              : capChange >= 0
                ? 'text-terminal-green'
                : 'text-terminal-red';

            const fngValue = typeof o?.fearGreed?.value === 'number' && Number.isFinite(o.fearGreed.value) ? o.fearGreed.value : null;
            let fngClass = o?.fearGreed?.classification ?? null;
            if (fngClass) {
              fngClass = fngClass.replace(/^Extreme /i, 'Ultra ');
            }
            const fngTone = (() => {
              if (!fngClass) return 'text-muted-foreground';
              const v = fngClass.toLowerCase();
              if (v.includes('greed')) return 'text-terminal-green';
              if (v.includes('neutral')) return 'text-terminal-amber';
              if (v.includes('fear')) return 'text-terminal-red';
              return 'text-muted-foreground';
            })();

            if (marketLoading || !o) {
              return (
                <>
                  <div className="p-2 bg-muted/30 border border-border">
                    <span className="text-[10px] text-muted-foreground block">Market Cap</span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                  </div>

                  <div className="p-2 bg-muted/30 border border-border">
                    <span className="text-[10px] text-muted-foreground block">24h Volume</span>
                    <div className="mt-1">
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>

                  <div className="p-2 bg-muted/30 border border-border">
                    <span className="text-[10px] text-muted-foreground block">BTC Dom</span>
                    <div className="mt-1">
                      <Skeleton className="h-4 w-14" />
                    </div>
                  </div>

                  <div className="p-2 bg-muted/30 border border-border">
                    <span className="text-[10px] text-muted-foreground block">Fear/Greed</span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <Skeleton className="h-4 w-8" />
                      <Skeleton className="h-3 w-14" />
                    </div>
                  </div>
                </>
              );
            }

            return (
              <>
                <div className="p-2 bg-muted/30 border border-border">
                  <span className="text-[10px] text-muted-foreground block">Market Cap</span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-sm font-medium text-foreground">
                      {typeof o.marketCapUsd === 'number' ? formatUsdCompact(o.marketCapUsd) : '—'}
                    </span>
                    {capChange === null ? null : (
                      <span className={`text-[10px] ${capChangeClass}`}>{fmtPct(capChange)}</span>
                    )}
                  </div>
                </div>

                <div className="p-2 bg-muted/30 border border-border">
                  <span className="text-[10px] text-muted-foreground block">24h Volume</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {typeof o.volume24hUsd === 'number' ? formatUsdCompact(o.volume24hUsd) : '—'}
                    </span>
                  </div>
                </div>

                <div className="p-2 bg-muted/30 border border-border">
                  <span className="text-[10px] text-muted-foreground block">BTC Dom</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {typeof o.btcDominancePct === 'number' ? `${o.btcDominancePct.toFixed(1)}%` : '—'}
                    </span>
                  </div>
                </div>

                <div className="p-2 bg-muted/30 border border-border">
                  <span className="text-[10px] text-muted-foreground block">Fear/Greed</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-sm font-medium text-foreground">{fngValue === null ? '—' : String(fngValue)}</span>
                    {fngClass ? (
                      <span className={`text-[10px] ${fngTone}`}>{fngClass}</span>
                    ) : null}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Recently Viewed */}
      <div className="p-4 border-b border-border">
        <button
          type="button"
          onClick={onToggleRecentView}
          className={`w-full text-left p-2 -mx-2 rounded transition-colors ${showRecentOnly ? "bg-primary/10" : "hover:bg-muted/30"}`}
          title="Recently viewed"
        >
          <div className={`flex items-center gap-2 ${recentArticlesCount === 0 ? "mb-2" : ""}`}>
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wider text-foreground">
              Recently Viewed
            </span>
          </div>
          {recentArticlesCount === 0 ? (
            <div className="text-xs text-muted-foreground">Nothing viewed yet</div>
          ) : null}
        </button>

        {recentArticlesCount > 0 && (
          <div className="mt-3 space-y-2">
            {recentArticlesPreviews.map((article, index) => {
              const url = article.url;
              return url ? (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-[10px] text-muted-foreground border-l-2 border-primary/30 pl-2 py-1 hover:border-primary transition-colors cursor-pointer"
                  title={article.title}
                  onClick={() => {
                    addRecent({
                      title: article.title,
                      url,
                      source: article.sourceName,
                    });
                  }}
                >
                  <div className="line-clamp-2 text-foreground mb-1">
                    {article.title}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-terminal-green">{article.time}</span>
                    <span>• {article.sourceName}</span>
                  </div>
                </a>
              ) : (
                <div
                  key={index}
                  className="text-[10px] text-muted-foreground border-l-2 border-primary/30 pl-2 py-1 hover:border-primary transition-colors cursor-pointer"
                  title={article.title}
                >
                  <div className="line-clamp-2 text-foreground mb-1">
                    {article.title}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-terminal-green">{article.time}</span>
                    <span>• {article.sourceName}</span>
                  </div>
                </div>
              );
            })}
            {recentArticlesCount > 3 && (
              <div className="text-[10px] text-muted-foreground pl-2">
                +{recentArticlesCount - 3} more
              </div>
            )}
          </div>
        )}
      </div>

      {/* Categories */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wider text-foreground">
              Categories
            </span>
          </div>
          <button
            className="p-1 rounded hover:bg-muted/30"
            onClick={() => setCategoriesCollapsed(v => !v)}
            aria-label="Toggle categories"
          >
            {categoriesCollapsed ? (
              <ChevronUp className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
        </div>
        {!categoriesCollapsed && (
          <>
            <input
              type="text"
              value={categorySearch}
              onChange={e => setCategorySearch(e.target.value)}
              placeholder="Search categories..."
              className="mb-2 w-full px-2 py-1 text-xs rounded border border-border bg-muted/40 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <CategoryScrollWithDynamicGradient
              categories={categories}
              categorySearch={categorySearch}
              selectedCategory={selectedCategory}
              onCategorySelect={onCategorySelect}
            />
          </>
        )}
      </div>

      {/* Bookmarks */}
      <div className="p-4 shrink-0 min-h-40 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        <button
          onClick={onToggleSavedView}
          className={`w-full text-left p-2 -mx-2 rounded transition-colors ${showSavedOnly ? "bg-primary/10" : "hover:bg-muted/30"
            }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Bookmark className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wider text-foreground">
              Saved Articles
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {savedArticlesCount === 0 ? (
              "No saved articles yet"
            ) : (
              <span>
                <span className="text-primary font-medium">{savedArticlesCount}</span> article{savedArticlesCount !== 1 ? 's' : ''} saved
              </span>
            )}
          </div>
        </button>

        {savedArticlesCount > 0 && (
          <div className="mt-3 space-y-2">
            {savedArticlesPreviews.map((article, index) => {
              const url = article.url;
              return url ? (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-[10px] text-muted-foreground border-l-2 border-primary/30 pl-2 py-1 hover:border-primary transition-colors cursor-pointer"
                  title={article.title}
                  onClick={() => {
                    addRecent({
                      title: article.title,
                      url,
                      source: article.sourceName,
                    });
                  }}
                >
                  <div className="line-clamp-2 text-foreground mb-1">
                    {article.title}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-terminal-green">{article.time}</span>
                    <span>• {article.sourceName}</span>
                  </div>
                </a>
              ) : (
                <div
                  key={index}
                  className="text-[10px] text-muted-foreground border-l-2 border-primary/30 pl-2 py-1 hover:border-primary transition-colors cursor-pointer"
                  title={article.title}
                >
                  <div className="line-clamp-2 text-foreground mb-1">
                    {article.title}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-terminal-green">{article.time}</span>
                    <span>• {article.sourceName}</span>
                  </div>
                </div>
              );
            })}
            {savedArticlesCount > 3 && (
              <div className="text-[10px] text-muted-foreground pl-2">
                +{savedArticlesCount - 3} more
              </div>
            )}
          </div>
        )}
      </div>

      {/* Links */}
      <div className="p-4 border-t border-border">
        <div className="space-y-1">
          <a
            href="https://x.com/cryptowi_re"
            className="w-full -mx-2 flex items-center gap-2 px-2 py-2 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            title="Follow on X"
          >
            <svg
              className="h-4 w-4 text-primary"
              viewBox="0 0 1200 1227"
              fill="currentColor"
            >
              <path
                d="M306.615 79.694H144.011L892.476 1150.3h162.604ZM0 0h357.328l309.814 450.883L1055.03 0h105.86L714.15 519.295 1200 1226.37H842.672L515.493 750.215 105.866 1226.37H0l468.485-544.568Z"
              />
            </svg>
            <span>@cryptowi_re</span>
          </a>
          <a
            href="/rss.xml"
            className="w-full -mx-2 flex items-center gap-2 px-2 py-2 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            title="RSS feed"
          >
            <Rss className="h-4 w-4 text-primary" />
            <span>RSS</span>
          </a>

          <a
            href="/install/ios"
            className="w-full -mx-2 flex items-center gap-2 px-2 py-2 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            title="Add to iOS home screen"
          >
            <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            <span>iOS</span>
          </a>

          <a
            href="/install/android"
            className="w-full -mx-2 flex items-center gap-2 px-2 py-2 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            title="Add to Android home screen"
          >
            <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24a11.43 11.43 0 0 0-8.94 0L5.65 5.67c-.19-.28-.54-.37-.83-.22-.3.16-.42.54-.26.85l1.84 3.18C4.8 10.92 3.5 12.93 3.34 15.34h17.32c-.16-2.41-1.46-4.42-3.06-5.86zM10.34 12.4c-.43 0-.78-.35-.78-.78s.35-.78.78-.78.78.35.78.78-.35.78-.78.78zm3.32 0c-.43 0-.78-.35-.78-.78s.35-.78.78-.78.78.35.78.78-.35.78-.78.78zM19 16.34c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1V21c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-4.66z" />
            </svg>
            <span>Android</span>
          </a>

          <a
            href="https://github.com/jonyive/cryptowire"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full -mx-2 flex items-center gap-2 px-2 py-2 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            title="View source on GitHub"
          >
            <Github className="h-4 w-4 text-primary" />
            <span>GitHub</span>
          </a>
        </div>
      </div>

      {/* Status */}
      <div className="p-4 border-t border-border">
        <button
          type="button"
          onClick={onSourcesClick}
          className="w-full text-left text-[10px] text-muted-foreground flex items-center gap-2 hover:text-primary transition-colors"
          title="Manage sources"
        >
          <span className={activeSourceCount === totalSourceCount ? "text-terminal-green" : "text-terminal-amber"}>
            <span className="inline-block -translate-y-[1px]">●</span>
          </span>
          <span className={activeSourceCount === totalSourceCount ? "text-terminal-green" : "text-muted-foreground"}>
            {activeSourceCount}/{totalSourceCount} Sources Active
          </span>
        </button>

        <div className="mt-3 space-y-3">
          <div className="text-[10px] text-muted-foreground">Articles loaded: {loadedArticlesCount}</div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] text-muted-foreground">© {new Date().getFullYear()} cryptowi.re</span>
            <span className="text-[10px] text-muted-foreground">v{appVersion}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
