
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
          <div className="p-2 bg-muted/30 border border-border">
            <span className="text-[10px] text-muted-foreground block">
              Market Cap
            </span>
            <span className="text-sm font-medium text-foreground">$3.42T</span>
            <span className="text-[10px] text-terminal-green ml-1">+2.4%</span>
          </div>
          <div className="p-2 bg-muted/30 border border-border">
            <span className="text-[10px] text-muted-foreground block">
              24h Volume
            </span>
            <span className="text-sm font-medium text-foreground">$142B</span>
            <span className="text-[10px] text-terminal-red ml-1">-1.2%</span>

          </div>
          <div className="p-2 bg-muted/30 border border-border">
            <span className="text-[10px] text-muted-foreground block">
              BTC Dom
            </span>
            <span className="text-sm font-medium text-foreground">52.3%</span>
          </div>
          <div className="p-2 bg-muted/30 border border-border">
            <span className="text-[10px] text-muted-foreground block">
              Fear/Greed
            </span>
            <span className="text-sm font-medium text-terminal-green">74</span>
          </div>
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
