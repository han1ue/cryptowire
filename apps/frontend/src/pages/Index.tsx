import { Header } from "@/components/Header";
import { PriceBar } from "@/components/PriceBar";
import { NewsTicker } from "@/components/NewsTicker";
import { Sidebar } from "@/components/Sidebar";
import { SettingsDialog } from "@/components/SettingsDialog";
import { NewsCard } from "@/components/NewsCard";
import { sources as sourcesConfig } from "@/data/sources";
import { useNews } from "@/hooks/useNews";
import { useInfiniteNews } from "@/hooks/useInfiniteNews";
import { useState, useEffect } from "react";
import { toast } from "@/components/ui/sonner";
import { Bookmark, Share2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { zodToJsonSchema } from "zod-to-json-schema";
import { NewsItemSchema } from "@cryptowire/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
};

const initialNotifications: NotificationItem[] = [
  {
    id: "welcome",
    title: "Welcome to CryptoWire",
    message:
      "Thanks for joining us. We'll drop feature updates and platform alerts here so you never miss a release.",
    time: "Just now",
    read: false,
  },
];

const Index = () => {
  const [selectedSources, setSelectedSources] = useState<string[]>(() => {
    const saved = localStorage.getItem("selectedSources");
    return saved ? JSON.parse(saved) : sourcesConfig.map(s => s.name);
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("theme");
    return saved === "light" ? "light" : "dark";
  });
  const [displayMode, setDisplayMode] = useState<"compact" | "line" | "cards">(() => {
    const saved = localStorage.getItem("displayMode");
    if (saved === "compact" || saved === "line" || saved === "cards") return saved;

    // Back-compat: older builds stored a boolean in `lineView`.
    const legacy = localStorage.getItem("lineView");
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy);
        return parsed ? "line" : "cards";
      } catch {
        // ignore
      }
    }

    // Default stays as the previous default (line).
    return "line";
  });
  const [savedArticles, setSavedArticles] = useState<string[]>(() => {
    const saved = localStorage.getItem("savedArticles");
    return saved ? JSON.parse(saved) : [];
  });
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All News');
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem("notifications");
    return saved ? JSON.parse(saved) : initialNotifications;
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Used by ticker/header components that want a small, frequently-updated set.
  const { data: newsData, isLoading: newsLoading, error: newsError } = useNews({ limit: 25 });

  // Used by the main list/cards view: loads 40 at a time as you scroll.
  const infinite = useInfiniteNews({ pageSize: 25 });
  const infiniteItems = infinite.data?.pages.flatMap((p) => p.items ?? []) ?? [];

  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const [devShowSchemaButtons, setDevShowSchemaButtons] = useState(() => {
    const saved = localStorage.getItem("devShowSchemaButtons");
    return saved === "true";
  });
  useEffect(() => {
    localStorage.setItem("devShowSchemaButtons", String(devShowSchemaButtons));
  }, [devShowSchemaButtons]);

  const [schemaDialogOpen, setSchemaDialogOpen] = useState(false);
  const [schemaDialogText, setSchemaDialogText] = useState<string>("");

  const showNewsItemSchema = () => {
    const jsonSchema = zodToJsonSchema(NewsItemSchema, "NewsItem");
    setSchemaDialogText(JSON.stringify(jsonSchema, null, 2));
    setSchemaDialogOpen(true);
  };

  useEffect(() => {
    if (newsError) {
      toast("Failed to load news");
    }
  }, [newsError]);

  useEffect(() => {
    localStorage.setItem("selectedSources", JSON.stringify(selectedSources));
  }, [selectedSources]);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);
  useEffect(() => {
    localStorage.setItem("displayMode", displayMode);
    // Keep legacy key in sync for older deployments that might still read it.
    localStorage.setItem("lineView", JSON.stringify(displayMode !== "cards"));
  }, [displayMode]);
  useEffect(() => {
    localStorage.setItem("savedArticles", JSON.stringify(savedArticles));
  }, [savedArticles]);
  useEffect(() => {
    localStorage.setItem("notifications", JSON.stringify(notifications));
  }, [notifications]);

  const toggleSaveArticle = (title: string) => {
    setSavedArticles(prev => {
      const isSaved = prev.includes(title);
      if (isSaved) {
        toast("Removed from saved articles");
        return prev.filter(t => t !== title);
      } else {
        toast("Added to saved articles");
        return [...prev, title];
      }
    });
  };

  useEffect(() => {
    const handler = (e: Event) => {
      if (e instanceof CustomEvent && e.detail?.message) {
        toast(e.detail.message);
      }
    };
    window.addEventListener('show-toast', handler);
    return () => window.removeEventListener('show-toast', handler);
  }, []);

  const markAllNotificationsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const sourcesWithNews = (() => {
    // If we have API data, use it
    if (infiniteItems.length > 0) {
      const bySource = new Map<string, typeof infiniteItems>();
      for (const item of infiniteItems) {
        const list = bySource.get(item.source) ?? [];
        list.push(item);
        bySource.set(item.source, list);
      }

      return sourcesConfig.map((s) => {
        const items = (bySource.get(s.name) ?? [])
          .slice(0, 50)
          .map((n) => ({
            title: n.title,
            summary: n.summary || "",
            time: formatDistanceToNow(new Date(n.publishedAt), { addSuffix: true }).replace(/^about /, ''),
            category: n.category || "News",
            url: n.url,
            isBreaking: false,
            publishedAt: n.publishedAt,
          }));

        return {
          name: s.name,
          icon: s.icon,
          news: items,
        };
      });
    }

    // No API data (yet) – don't mask it with mock content.
    return sourcesConfig.map((s) => ({
      name: s.name,
      icon: s.icon,
      news: [],
    }));
  })();

  // Auto-load more when near the bottom of the scrollable list.
  useEffect(() => {
    const el = document.getElementById("news-infinite-sentinel");
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        if (!infinite.hasNextPage) return;
        if (infinite.isFetchingNextPage) return;
        void infinite.fetchNextPage();
      },
      { root: null, rootMargin: "400px", threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [infinite.hasNextPage, infinite.isFetchingNextPage, infinite.fetchNextPage]);

  const activeSources = sourcesWithNews.filter(source => selectedSources.includes(source.name));

  let allNews = activeSources
    .flatMap(source =>
      source.news.map((item: any) => ({ ...item, sourceName: source.name, sourceIcon: source.icon }))
    )
    .sort((a: any, b: any) => {
      const aTime = new Date(a.publishedAt ?? 0).getTime();
      const bTime = new Date(b.publishedAt ?? 0).getTime();
      return bTime - aTime;
    });
  if (showSavedOnly) {
    allNews = allNews.filter(item => savedArticles.includes(item.title));
  }
  if (selectedCategory && selectedCategory !== 'All News') {
    allNews = allNews.filter(item => item.category === selectedCategory);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col scanlines">
      <Header
        onSettingsClick={() => setSettingsOpen(true)}
        notifications={notifications}
        onNotificationsViewed={markAllNotificationsRead}
        onMenuClick={() => setSidebarOpen(true)}
      />
      <PriceBar />
      <NewsTicker />

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block self-start">
          <Sidebar
            savedArticlesCount={savedArticles.length}
            showSavedOnly={showSavedOnly}
            onToggleSavedView={() => {
              setShowSavedOnly(!showSavedOnly);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            savedArticleTitles={savedArticles}
            allNews={activeSources
              .flatMap(source =>
                source.news.map(item => ({ ...item, sourceName: source.name, sourceIcon: source.icon, category: item.category }))
              )
            }
            selectedCategory={selectedCategory}
            onCategorySelect={cat => {
              setSelectedCategory(cat);
              setShowSavedOnly(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>

        {/* Mobile Sidebar Drawer */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 w-64 z-50 lg:hidden">
              <Sidebar
                savedArticlesCount={savedArticles.length}
                showSavedOnly={showSavedOnly}
                onToggleSavedView={() => {
                  setShowSavedOnly(!showSavedOnly);
                  setSidebarOpen(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                savedArticleTitles={savedArticles}
                allNews={activeSources
                  .flatMap(source =>
                    source.news.map(item => ({ ...item, sourceName: source.name, sourceIcon: source.icon, category: item.category }))
                  )
                }
                selectedCategory={selectedCategory}
                onCategorySelect={cat => {
                  setSelectedCategory(cat);
                  setShowSavedOnly(false);
                  setSidebarOpen(false);
                }}
              />
            </div>
          </>
        )}

        <main className="flex-1 p-2 sm:p-4">
          {allNews.length === 0 && showSavedOnly ? (
            <div className="flex-1 flex items-center justify-center bg-card/30 border border-border rounded p-12 sm:p-20">
              <div className="text-center text-muted-foreground">
                <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No saved articles yet</p>
                <p className="text-xs mt-2">Click the bookmark icon on any article to save it</p>
              </div>
            </div>
          ) : displayMode === "compact" ? (
            <div className="bg-card/30 border border-border rounded p-1 sm:p-4">
              <div className="space-y-0.5 sm:space-y-1">
                {(infinite.isLoading || infinite.isFetching) && allNews.length === 0 && !showSavedOnly ? (
                  <div className="space-y-2">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="p-2">
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))}
                  </div>
                ) : null}

                {allNews.map((item, index) => (
                  <div key={index} className="group hover-enabled px-2 py-1.5 rounded transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <div className="hidden sm:block shrink-0 w-24">
                            <div className="text-news-time tabular-nums text-[10px] whitespace-nowrap">{item.time}</div>
                          </div>
                          <div className="min-w-0 flex-1 flex items-baseline gap-2">
                            {item.url ? (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] sm:text-xs leading-snug text-foreground group-hover:text-primary transition-colors block"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {item.title}
                              </a>
                            ) : (
                              <span className="text-[11px] sm:text-xs leading-snug text-foreground block">{item.title}</span>
                            )}
                            <span className="hidden sm:inline text-[10px] text-muted-foreground whitespace-nowrap">{item.sourceName}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 flex-col sm:flex-row">
                        {devShowSchemaButtons ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              showNewsItemSchema();
                            }}
                            className="transition-colors"
                            title="Show news item schema"
                          >
                            <span className="text-[10px] text-muted-foreground hover:text-primary">schema</span>
                          </button>
                        ) : null}

                        {item.url ? (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (navigator.share) {
                                try {
                                  await navigator.share({ title: item.title, url: item.url });
                                } catch {
                                  // ignore
                                }
                              } else {
                                await navigator.clipboard.writeText(item.url);
                                if (typeof window !== "undefined" && window.dispatchEvent) {
                                  window.dispatchEvent(
                                    new CustomEvent("show-toast", { detail: { message: "Link copied to clipboard" } })
                                  );
                                }
                              }
                            }}
                            className="transition-colors"
                            title="Share article"
                          >
                            <Share2 className="h-5 w-5 text-muted-foreground hover:text-primary" />
                          </button>
                        ) : null}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSaveArticle(item.title);
                          }}
                          className="transition-colors"
                          title={savedArticles.includes(item.title) ? "Remove from saved" : "Save article"}
                        >
                          <Bookmark
                            className={`h-5 w-5 ${savedArticles.includes(item.title)
                              ? "fill-primary text-primary"
                              : "text-muted-foreground hover:text-primary"}`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <div id="news-infinite-sentinel" className="h-8 w-full" />

                {infinite.isFetchingNextPage ? (
                  <div className="px-2 py-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-block h-2 w-2 rounded-full bg-terminal-amber" />
                      <span>Loading more…</span>
                    </div>
                  </div>
                ) : null}

                {!showSavedOnly && !infinite.isFetchingNextPage && allNews.length > 0 && !infinite.hasNextPage ? (
                  <div className="px-2 py-4 text-xs text-muted-foreground">You’ve reached the end.</div>
                ) : null}
              </div>
            </div>
          ) : displayMode === "line" ? (
            <div className="bg-card/30 border border-border rounded p-1 sm:p-4">
              <div className="space-y-1 sm:space-y-2">
                {(infinite.isLoading || infinite.isFetching) && allNews.length === 0 && !showSavedOnly ? (
                  <div className="space-y-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="p-2">
                        <Skeleton className="h-4 w-full" />
                        <div className="mt-2 flex gap-2">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {allNews.map((item, index) => (
                  <div key={index} className="group hover-enabled p-2 rounded transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {item.url ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors block"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {item.title}
                          </a>
                        ) : (
                          <span className="text-xs sm:text-sm text-foreground block">{item.title}</span>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          <span className="text-news-time tabular-nums">{item.time}</span>
                          <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wider font-medium">
                            {item.category}
                          </span>
                          <span>{item.sourceName}</span>
                        </div>
                      </div>

                      <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 flex-col sm:flex-row">
                        {devShowSchemaButtons ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              showNewsItemSchema();
                            }}
                            className="transition-colors"
                            title="Show news item schema"
                          >
                            <span className="text-[10px] text-muted-foreground hover:text-primary">schema</span>
                          </button>
                        ) : null}

                        {item.url ? (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (navigator.share) {
                                try {
                                  await navigator.share({ title: item.title, url: item.url });
                                } catch {
                                  // ignore
                                }
                              } else {
                                await navigator.clipboard.writeText(item.url);
                                if (typeof window !== "undefined" && window.dispatchEvent) {
                                  window.dispatchEvent(
                                    new CustomEvent("show-toast", { detail: { message: "Link copied to clipboard" } })
                                  );
                                }
                              }
                            }}
                            className="transition-colors"
                            title="Share article"
                          >
                            <Share2 className="h-5 w-5 text-muted-foreground hover:text-primary" />
                          </button>
                        ) : null}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSaveArticle(item.title);
                          }}
                          className="transition-colors"
                          title={savedArticles.includes(item.title) ? "Remove from saved" : "Save article"}
                        >
                          <Bookmark
                            className={`h-5 w-5 ${savedArticles.includes(item.title)
                              ? "fill-primary text-primary"
                              : "text-muted-foreground hover:text-primary"}`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <div id="news-infinite-sentinel" className="h-8 w-full" />

                {infinite.isFetchingNextPage ? (
                  <div className="px-2 py-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-block h-2 w-2 rounded-full bg-terminal-amber" />
                      <span>Loading more…</span>
                    </div>
                  </div>
                ) : null}

                {!showSavedOnly && !infinite.isFetchingNextPage && allNews.length > 0 && !infinite.hasNextPage ? (
                  <div className="px-2 py-4 text-xs text-muted-foreground">You’ve reached the end.</div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
              {(infinite.isLoading || infinite.isFetching) && allNews.length === 0 && !showSavedOnly ? (
                <>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="p-3 sm:p-4 bg-card border border-border">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="mt-3 h-3 w-full" />
                      <Skeleton className="mt-2 h-3 w-5/6" />
                      <Skeleton className="mt-4 h-3 w-24" />
                    </div>
                  ))}
                </>
              ) : null}

              {allNews.map((item, index) => (
                <NewsCard
                  key={index}
                  title={item.title}
                  summary={item.summary}
                  source={item.sourceName}
                  time={item.time}
                  category={item.category}
                  url={item.url}
                  isSaved={savedArticles.includes(item.title)}
                  onToggleSave={() => toggleSaveArticle(item.title)}
                  showSchemaButton={devShowSchemaButtons}
                  onShowSchema={showNewsItemSchema}
                />
              ))}

              <div id="news-infinite-sentinel" className="h-8 w-full" />

              {infinite.isFetchingNextPage ? (
                <div className="col-span-full px-2 py-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-block h-2 w-2 rounded-full bg-terminal-amber" />
                    <span>Loading more…</span>
                  </div>
                </div>
              ) : null}

              {!showSavedOnly && !infinite.isFetchingNextPage && allNews.length > 0 && !infinite.hasNextPage ? (
                <div className="col-span-full px-2 py-4 text-xs text-muted-foreground">You’ve reached the end.</div>
              ) : null}
            </div>
          )}
        </main>
      </div>

      {/* Status Bar */}
      <footer className="border-t border-border bg-card/50 px-4 py-2 flex items-center justify-between">
        <div className="flex gap-4">
          <span className="text-[10px] text-muted-foreground flex items-center gap-2">
            <span
              className={
                activeSources.length === sourcesConfig.length ? "text-terminal-green" : "text-terminal-amber"
              }
            >
              {/* Slight upward shift keeps the dot optically centered with the text */}
              <span className="inline-block -translate-y-[1px]">●</span>
            </span>
            <span className={activeSources.length === sourcesConfig.length ? "text-terminal-green" : "text-muted-foreground"}>
              {activeSources.length}/{sourcesConfig.length} Sources Active
            </span>
          </span>
          <span className="text-[10px] text-muted-foreground">
            {activeSources.reduce((sum, s) => sum + s.news.length, 0)} Articles Loaded
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/install/ios"
            className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            title="Add to iOS home screen"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            <span>iOS</span>
          </a>
          <a
            href="/install/android"
            className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            title="Add to Android home screen"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24a11.43 11.43 0 0 0-8.94 0L5.65 5.67c-.19-.28-.54-.37-.83-.22-.3.16-.42.54-.26.85l1.84 3.18C4.8 10.92 3.5 12.93 3.34 15.34h17.32c-.16-2.41-1.46-4.42-3.06-5.86zM10.34 12.4c-.43 0-.78-.35-.78-.78s.35-.78.78-.78.78.35.78.78-.35.78-.78.78zm3.32 0c-.43 0-.78-.35-.78-.78s.35-.78.78-.78.78.35.78.78-.35.78-.78.78zM19 16.34c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1V21c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-4.66z" />
            </svg>
            <span>Android</span>
          </a>
          <Popover open={devToolsOpen} onOpenChange={setDevToolsOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="text-[10px] text-muted-foreground hover:text-primary transition-colors"
                title="Developer tools"
              >
                v1.0.0
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64">
              <div className="space-y-3">
                <div className="text-xs font-medium uppercase tracking-wider text-foreground">Dev tools</div>
                <button
                  type="button"
                  className="w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                >
                  Clear local storage
                </button>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">Schema buttons</span>
                  <Switch checked={devShowSchemaButtons} onCheckedChange={setDevShowSchemaButtons} />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </footer>

      <AlertDialog open={schemaDialogOpen} onOpenChange={setSchemaDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>News item JSON schema</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="max-h-[60vh] overflow-auto rounded border border-border bg-muted/30 p-3">
            <pre className="text-[11px] leading-snug text-muted-foreground whitespace-pre-wrap break-words">
              {schemaDialogText}
            </pre>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        selectedSources={selectedSources}
        onSelectedSourcesChange={setSelectedSources}
        displayMode={displayMode}
        onDisplayModeChange={setDisplayMode}
        theme={theme}
        onThemeChange={setTheme}
      />
    </div>
  );
};

export default Index;
