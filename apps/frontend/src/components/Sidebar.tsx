
import {
  TrendingUp,
  Newspaper,
  BarChart3,
  Bookmark,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useMarketOverview } from '@/hooks/useMarketOverview';
import { Skeleton } from '@/components/ui/skeleton';

// Helper component for scrollable category list with dynamic gradient
function CategoryScrollWithDynamicGradient({
  categories,
  categorySearch,
  selectedCategory,
  onCategorySelect,
  categoryCounts,
}: {
  categories: string[];
  categorySearch: string;
  selectedCategory: string;
  onCategorySelect: (cat: string) => void;
  categoryCounts: Record<string, number>;
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
              <span className="text-[10px] opacity-60">
                {categoryCounts[cat] || 0}
              </span>
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
  savedArticleTitles?: string[];
  allNews?: Array<{ title: string; time: string; sourceName: string; category?: string }>;
  selectedCategory?: string;
  onCategorySelect?: (cat: string) => void;
}

export const Sidebar = ({
  savedArticlesCount = 0,
  showSavedOnly = false,
  onToggleSavedView,
  savedArticleTitles = [],
  allNews = [],
  selectedCategory = 'All News',
  onCategorySelect = () => { },
}: SidebarProps) => {
  const { data: marketData, isLoading: marketLoading } = useMarketOverview();
  const [categoriesCollapsed, setCategoriesCollapsed] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  // Removed showMoreCategories and related logic; always show all filtered categories
  const savedArticlesPreviews = allNews
    .filter(article => savedArticleTitles.includes(article.title))
    .slice(0, 3);

  // Count articles per category
  const categoryCounts: Record<string, number> = { 'All News': allNews.length };
  allNews.forEach(article => {
    if (article.category) {
      categoryCounts[article.category] = (categoryCounts[article.category] || 0) + 1;
    }
  });

  const categories = [
    "All News",
    ...Array.from(
      new Set(allNews.map((a) => a.category).filter((c): c is string => Boolean(c)))
    ),
  ].sort((a, b) => {
    if (a === "All News") return -1;
    if (b === "All News") return 1;
    const diff = (categoryCounts[b] || 0) - (categoryCounts[a] || 0);
    if (diff !== 0) return diff;
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
              categoryCounts={categoryCounts}
            />
          </>
        )}
      </div>

      {/* Bookmarks */}
      <div className="p-4 flex-1 overflow-y-auto">
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
            {savedArticlesPreviews.map((article, index) => (
              <div
                key={index}
                className="text-[10px] text-muted-foreground border-l-2 border-primary/30 pl-2 py-1 hover:border-primary transition-colors cursor-pointer"
              >
                <div className="line-clamp-2 text-foreground mb-1">
                  {article.title}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-terminal-green">{article.time}</span>
                  <span>• {article.sourceName}</span>
                </div>
              </div>
            ))}
            {savedArticlesCount > 3 && (
              <div className="text-[10px] text-muted-foreground pl-2">
                +{savedArticlesCount - 3} more
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
