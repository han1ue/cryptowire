import { Header } from "@/components/Header";
import { PriceBar } from "@/components/PriceBar";
import { NewsTicker } from "@/components/NewsTicker";
import { Sidebar } from "@/components/Sidebar";
import { SettingsDialog } from "@/components/SettingsDialog";
import { NewsCard } from "@/components/NewsCard";
import { sources as sourcesConfig, SourceId, SourceName } from "@/data/sources";
import { useInfiniteNews } from "@/hooks/useInfiniteNews";
import { useSavedArticles } from "@/hooks/useSavedArticles";
import { useNewsStatus } from "@/hooks/useNewsStatus";
import { useState, useEffect, useRef } from "react";
import { toast } from "@/components/ui/sonner";
import { Bookmark, MoreVertical, Share2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Seo } from "@/components/Seo";
import { useNavigate } from "react-router-dom";

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
    title: "Welcome to cryptowi.re",
    message:
      "Thanks for joining us. We'll drop feature updates and platform alerts here so you never miss a release.",
    time: "Just now",
    read: false,
  },
];

const Index = () => {
  const navigate = useNavigate();
  const DEFAULT_SELECTED_SOURCE_IDS: SourceId[] = [
    "coindesk",
    "decrypt",
    "cointelegraph",
    "blockworks",
  ];

  const normalizeSelectedSources = (raw: unknown): SourceId[] => {
    const byId = new Set<SourceId>(sourcesConfig.map((s) => s.id));

    const arr = Array.isArray(raw) ? raw : [];
    const normalized = arr.map((v) => String(v).trim().toLowerCase() as SourceId);

    const isSourceId = (s: string): s is SourceId => byId.has(s as SourceId);

    // De-dupe preserving order and filter invalid ids
    return Array.from(new Set(normalized)).filter(isSourceId);
  };

  const [selectedSources, setSelectedSources] = useState<SourceId[]>(() => {
    const saved = localStorage.getItem("selectedSources");
    if (!saved) return Array.from(DEFAULT_SELECTED_SOURCE_IDS);
    try {
      const parsed = JSON.parse(saved);
      const normalized = normalizeSelectedSources(parsed);
      return normalized.length > 0 ? normalized : Array.from(DEFAULT_SELECTED_SOURCE_IDS);
    } catch {
      return Array.from(DEFAULT_SELECTED_SOURCE_IDS);
    }
  });

  const newsStatus = useNewsStatus();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const getSavedTheme = (): "light" | "dark" | null => {
    try {
      const saved = localStorage.getItem("theme");
      return saved === "light" || saved === "dark" ? saved : null;
    } catch {
      return null;
    }
  };

  const getSystemTheme = (): "light" | "dark" => {
    const systemPrefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
    return systemPrefersDark ? "dark" : "light";
  };

  const [themeIsUserSelected, setThemeIsUserSelected] = useState(() => getSavedTheme() !== null);
  const [theme, setTheme] = useState<"light" | "dark">(() => getSavedTheme() ?? getSystemTheme());

  const handleThemeChange = (next: "light" | "dark") => {
    setThemeIsUserSelected(true);
    setTheme(next);
  };
  const [displayMode, setDisplayMode] = useState<"compact" | "line" | "cards">(() => {
    const saved = localStorage.getItem("displayMode");
    if (saved === "compact" || saved === "line" || saved === "cards") return saved;

    // Default stays as the previous default (line).
    return "line";
  });
  const { savedArticles, savedTitles: savedArticleTitles, toggleSaved: toggleSaveArticle } = useSavedArticles();
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All News');

  const SCROLL_THRESHOLD_PX = 24;
  const [hasUserScrolled, setHasUserScrolled] = useState(false);
  const userInitiatedScrollRef = useRef(false);
  const END_OF_LIST_BASE = "You’ve reached the end.";
  const END_OF_LIST_SUFFIXES = [
    "That was a lot of reading.",
    "You’re officially caught up.",
    "No more headlines — go hydrate.",
    "The feed is empty. The charts are calling.",
    "Achievement unlocked: Doomscrolling (Peaceful Mode).",
    "End of transmission.",
    "That’s all, folks. Until the next candle.",
  ];
  const [endOfListSuffix, setEndOfListSuffix] = useState<string>("");
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem("notifications");
    return saved ? JSON.parse(saved) : initialNotifications;
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const selectedCategoryKey = selectedCategory && selectedCategory !== "All News" ? selectedCategory : null;

  useEffect(() => {
    const onScroll = () => {
      if (!userInitiatedScrollRef.current) return;
      if (window.scrollY > SCROLL_THRESHOLD_PX) setHasUserScrolled(true);
    };

    const markUserScrollIntent = () => {
      userInitiatedScrollRef.current = true;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Only treat common scroll/navigation keys as scroll intent.
      if (
        e.key === "ArrowDown" ||
        e.key === "PageDown" ||
        e.key === "End" ||
        e.key === " "
      ) {
        markUserScrollIntent();
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", markUserScrollIntent, { passive: true });
    window.addEventListener("touchmove", markUserScrollIntent, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", markUserScrollIntent);
      window.removeEventListener("touchmove", markUserScrollIntent);
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const availableSources = sourcesConfig;

  useEffect(() => {
    // Keep selection valid if the local list changes.
    setSelectedSources((prev) => {
      const normalized = normalizeSelectedSources(prev);
      return normalized.length > 0 ? normalized : Array.from(DEFAULT_SELECTED_SOURCE_IDS);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourcesConfig.map((s) => s.id).join("|")]);

  // Used by the main list/cards view: loads 40 at a time as you scroll.
  const infinite = useInfiniteNews({
    pageSize: 25,
    sources: selectedSources,
  });
  const infiniteItems = infinite.data?.pages.flatMap((p) => p.items ?? []) ?? [];

  // Category view: fetches the first 20, then can infinitely scroll.
  const categoryInfinite = useInfiniteNews({
    pageSize: 20,
    sources: selectedSources,
    category: selectedCategoryKey ?? undefined,
  });
  const categoryInfiniteItems = categoryInfinite.data?.pages.flatMap((p) => p.items ?? []) ?? [];

  // Reset scroll/end-message state when the list context changes.
  useEffect(() => {
    userInitiatedScrollRef.current = false;
    setHasUserScrolled(false);
    setEndOfListSuffix("");
  }, [showSavedOnly, selectedCategory, selectedSources.join("|")]);

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
    localStorage.setItem("selectedSources", JSON.stringify(selectedSources));
  }, [selectedSources]);

  useEffect(() => {
    if (themeIsUserSelected) return;

    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;

    const updateFromSystem = () => {
      setTheme(media.matches ? "dark" : "light");
    };

    updateFromSystem();
    media.addEventListener?.("change", updateFromSystem);
    media.addListener?.(updateFromSystem);

    return () => {
      media.removeEventListener?.("change", updateFromSystem);
      media.removeListener?.(updateFromSystem);
    };
  }, [themeIsUserSelected]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    if (!themeIsUserSelected) return;
    localStorage.setItem("theme", theme);
  }, [theme, themeIsUserSelected]);
  useEffect(() => {
    localStorage.setItem("displayMode", displayMode);
  }, [displayMode]);
  useEffect(() => {
    localStorage.setItem("notifications", JSON.stringify(notifications));
  }, [notifications]);

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

  const sourceNameToId = new Map<string, SourceId>(
    availableSources.map((s) => [s.name.toLowerCase(), s.id])
  );

  // Auto-load more when near the bottom of the scrollable list.
  useEffect(() => {
    if (showSavedOnly) return;
    const el = document.getElementById("news-infinite-sentinel");
    if (!el) return;

    const activeInfinite = selectedCategory === 'All News' ? infinite : categoryInfinite;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;
        if (!activeInfinite.hasNextPage) return;
        if (activeInfinite.isFetchingNextPage) return;
        void activeInfinite.fetchNextPage();
      },
      { root: null, rootMargin: "400px", threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [
    showSavedOnly,
    selectedCategory,
    infinite,
    categoryInfinite,
    infinite.hasNextPage,
    infinite.isFetchingNextPage,
    infinite.fetchNextPage,
    categoryInfinite.hasNextPage,
    categoryInfinite.isFetchingNextPage,
    categoryInfinite.fetchNextPage,
  ]);

  const baseItems = selectedCategoryKey ? categoryInfiniteItems : infiniteItems;

  // Sidebar needs a broader set to derive available categories, even when the main
  // list is showing a backend category view.
  const sidebarBaseItems = infiniteItems;

  // Apply source selection using the backend-provided source names.
  const filteredBySource = baseItems.filter((item) => {
    const sourceName = item?.source ?? "";
    const id = sourceNameToId.get(sourceName.toLowerCase());
    if (!id) return false;
    return selectedSources.includes(id);
  });

  const sidebarFilteredBySource = sidebarBaseItems.filter((item) => {
    const sourceName = item?.source ?? "";
    const id = sourceNameToId.get(sourceName.toLowerCase());
    if (!id) return false;
    return selectedSources.includes(id);
  });

  const savedOnlyNews = savedArticles
    .filter((a) => {
      const sourceName = a.source ?? "";
      if (!sourceName) return true;
      const id = sourceNameToId.get(sourceName.toLowerCase());
      if (!id) return true;
      return selectedSources.includes(id);
    })
    .map((a) => {
      const publishedAt = a.publishedAt ?? a.savedAt;
      return {
        id: a.key,
        title: a.title,
        summary: a.summary || "",
        time: formatDistanceToNow(new Date(publishedAt), { addSuffix: true }).replace(/^about /, ""),
        category: a.category || "News",
        url: a.url,
        isBreaking: false,
        publishedAt,
        sourceName: a.source ?? "Saved",
      };
    });

  const allNews = (showSavedOnly ? savedOnlyNews : filteredBySource)
    .map((n) => {
      if (showSavedOnly) return n;
      return {
        id: n.id,
        title: n.title,
        summary: n.summary || "",
        time: formatDistanceToNow(new Date(n.publishedAt), { addSuffix: true }).replace(/^about /, ""),
        category: n.category || "News",
        url: n.url,
        isBreaking: false,
        publishedAt: n.publishedAt,
        sourceName: n.source,
      };
    })
    .sort((a, b) => {
      const aTime = new Date(a.publishedAt ?? 0).getTime();
      const bTime = new Date(b.publishedAt ?? 0).getTime();
      return bTime - aTime;
    });

  const sidebarNews = sidebarFilteredBySource
    .map((n) => {
      return {
        id: n.id,
        title: n.title,
        summary: n.summary || "",
        time: formatDistanceToNow(new Date(n.publishedAt), { addSuffix: true }).replace(/^about /, ""),
        category: n.category || "News",
        url: n.url,
        isBreaking: false,
        publishedAt: n.publishedAt,
        sourceName: n.source,
      };
    })
    .sort((a, b) => {
      const aTime = new Date(a.publishedAt ?? 0).getTime();
      const bTime = new Date(b.publishedAt ?? 0).getTime();
      return bTime - aTime;
    });

  const activeSourceCount = selectedSources.length;
  const totalSourceCount = availableSources.length;
  const loadedArticlesCount = allNews.length;

  const isFetchingNext = selectedCategory === 'All News'
    ? infinite.isFetchingNextPage
    : categoryInfinite.isFetchingNextPage;
  const hasNextPage = selectedCategory === 'All News'
    ? infinite.hasNextPage
    : categoryInfinite.hasNextPage;
  const shouldShowEndMessage =
    !showSavedOnly &&
    !isFetchingNext &&
    allNews.length > 0 &&
    !hasNextPage &&
    hasUserScrolled;

  const shouldRenderInfiniteSentinel = !showSavedOnly && (hasNextPage ?? true);

  useEffect(() => {
    if (!shouldShowEndMessage) return;
    setEndOfListSuffix((prev) => {
      if (prev) return prev;
      const pick = END_OF_LIST_SUFFIXES[Math.floor(Math.random() * END_OF_LIST_SUFFIXES.length)];
      return pick;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShowEndMessage]);

  const siteUrl = (import.meta.env.VITE_SITE_URL as string | undefined) ?? "https://cryptowi.re";
  const normalizedSiteUrl = siteUrl.replace(/\/+$/, "");

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "cryptowi.re",
      url: normalizedSiteUrl,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "cryptowi.re",
      url: normalizedSiteUrl,
      description:
        "Real-time crypto news aggregator. Live headlines from CoinDesk, Decrypt, Cointelegraph, Blockworks, and more.",
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Crypto News Aggregator",
      url: normalizedSiteUrl + "/",
      isPartOf: { "@type": "WebSite", url: normalizedSiteUrl },
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col scanlines overflow-x-hidden">
      <Seo
        title="cryptowi.re | Real-Time Crypto News Aggregator"
        description="Real-time crypto news aggregator. Live headlines from CoinDesk, Decrypt, Cointelegraph, Blockworks, and more."
        canonicalPath="/"
        jsonLd={jsonLd}
      />

      <h1 className="sr-only">cryptowi.re — Crypto news aggregator</h1>
      <Header
        onSettingsClick={() => setSettingsOpen(true)}
        notifications={notifications}
        onNotificationsViewed={markAllNotificationsRead}
        onMenuClick={() => setSidebarOpen(true)}
        lastRefreshAt={newsStatus.data?.lastRefreshAt ?? null}
      />
      <PriceBar />
      <NewsTicker sources={selectedSources} />

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block self-start">
          <Sidebar
            savedArticlesCount={savedArticles.length}
            showSavedOnly={showSavedOnly}
            onToggleSavedView={() => {
              setShowSavedOnly((prev) => {
                const next = !prev;
                // When leaving Saved Articles, always return to All News.
                if (prev && !next) setSelectedCategory('All News');
                return next;
              });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            savedArticles={savedArticles}
            allNews={sidebarNews}
            selectedCategory={selectedCategory}
            onCategorySelect={cat => {
              setSelectedCategory((prev) => (prev === cat ? 'All News' : cat));
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
                  setShowSavedOnly((prev) => {
                    const next = !prev;
                    // When leaving Saved Articles, always return to All News.
                    if (prev && !next) setSelectedCategory('All News');
                    return next;
                  });
                  setSidebarOpen(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                savedArticles={savedArticles}
                allNews={sidebarNews}
                selectedCategory={selectedCategory}
                onCategorySelect={cat => {
                  setSelectedCategory((prev) => (prev === cat ? 'All News' : cat));
                  setShowSavedOnly(false);
                  setSidebarOpen(false);
                }}
              />
            </div>
          </>
        )}

        <main
          className={`flex-1 ${displayMode === "cards" ? "p-2 sm:p-4" : "px-0 py-2 sm:p-4"}`}
        >
          {!showSavedOnly && selectedSources.length === 0 ? (
            <div className="flex-1 flex items-center justify-center bg-card/30 border border-border rounded p-12 sm:p-20">
              <div className="text-center text-muted-foreground">
                <p className="text-sm">Please select some sources to get the latest news</p>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="mt-4 px-3 py-2 text-xs font-medium uppercase tracking-wider transition-colors bg-primary text-primary-foreground"
                >
                  Select sources
                </button>
              </div>
            </div>
          ) : !showSavedOnly && selectedSources.length > 0 && allNews.length === 0 && !(
            (selectedCategory === 'All News'
              ? (infinite.isLoading || infinite.isFetching)
              : (categoryInfinite.isLoading || categoryInfinite.isFetching))
          ) ? (
            <div className="flex-1 flex items-center justify-center bg-card/30 border border-border rounded p-12 sm:p-20">
              <div className="text-center text-muted-foreground">
                <p className="text-sm">No news found for your selected sources</p>
                <p className="text-xs mt-2">Try selecting more sources and check back</p>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="mt-4 px-3 py-2 text-xs font-medium uppercase tracking-wider transition-colors bg-primary text-primary-foreground"
                >
                  Edit sources
                </button>
              </div>
            </div>
          ) : allNews.length === 0 && showSavedOnly ? (
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

                {allNews.map((item) => (
                  <div
                    key={item.id}
                    className="hover-group hover-enabled px-2 py-1.5 rounded transition-colors border-b border-border/60 last:border-b-0 cursor-pointer"
                    onClick={() => {
                      if (item.url) window.open(item.url, "_blank", "noopener,noreferrer");
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === " ") && item.url) {
                        window.open(item.url, "_blank", "noopener,noreferrer");
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <div className="hidden sm:block shrink-0 w-24">
                            <div className="text-news-time tabular-nums text-[10px] whitespace-nowrap">{item.time}</div>
                          </div>
                          <div className="min-w-0 flex-1 flex items-baseline gap-2">
                            <span className="hover-title text-[11px] sm:text-xs leading-snug text-foreground transition-colors block line-clamp-2">
                              <span>{item.title}</span>
                              <span className="text-[10px] text-muted-foreground">&nbsp;·&nbsp;{item.sourceName}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="hidden sm:flex items-center gap-2">
                          {item.url ? (
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  if (navigator.share) {
                                    await navigator.share({ title: item.title, url: item.url });
                                  } else {
                                    await navigator.clipboard.writeText(item.url);
                                    window.dispatchEvent(
                                      new CustomEvent("show-toast", {
                                        detail: { message: "Link copied to clipboard" },
                                      }),
                                    );
                                  }
                                } catch {
                                  // ignore
                                }
                              }}
                              className="transition-colors"
                              title="Share article"
                            >
                              <Share2 className="h-4 w-4 text-muted-foreground hover:text-primary" />
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSaveArticle({
                                id: item.id,
                                title: item.title,
                                url: item.url,
                                publishedAt: item.publishedAt,
                                source: item.sourceName,
                                summary: item.summary,
                                category: item.category,
                              });
                            }}
                            className="transition-colors"
                            title={savedArticleTitles.includes(item.title) ? "Remove from saved" : "Save article"}
                          >
                            <Bookmark
                              className={`h-4 w-4 ${savedArticleTitles.includes(item.title)
                                ? "fill-primary text-primary"
                                : "text-muted-foreground hover:text-primary"
                                }`}
                            />
                          </button>
                        </div>

                        <div className="sm:hidden">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="transition-colors"
                                title="Actions"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4 text-muted-foreground hover:text-primary" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              {item.url ? (
                                <DropdownMenuItem
                                  onSelect={async () => {
                                    try {
                                      if (navigator.share) {
                                        await navigator.share({ title: item.title, url: item.url! });
                                      } else {
                                        await navigator.clipboard.writeText(item.url!);
                                        window.dispatchEvent(
                                          new CustomEvent("show-toast", {
                                            detail: { message: "Link copied to clipboard" },
                                          }),
                                        );
                                      }
                                    } catch {
                                      // ignore
                                    }
                                  }}
                                >
                                  Share
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuItem
                                onSelect={() =>
                                  toggleSaveArticle({
                                    id: item.id,
                                    title: item.title,
                                    url: item.url,
                                    publishedAt: item.publishedAt,
                                    source: item.sourceName,
                                    summary: item.summary,
                                    category: item.category,
                                  })
                                }
                              >
                                {savedArticleTitles.includes(item.title) ? "Remove saved" : "Save"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {shouldRenderInfiniteSentinel ? <div id="news-infinite-sentinel" className="h-8 w-full" /> : null}

                {!showSavedOnly && (selectedCategory === 'All News' ? infinite.isFetchingNextPage : categoryInfinite.isFetchingNextPage) ? (
                  <div className="px-2 py-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-block h-2 w-2 rounded-full bg-terminal-amber" />
                      <span>Loading more…</span>
                    </div>
                  </div>
                ) : null}

                {shouldShowEndMessage ? (
                  <div className="px-2 py-4 text-xs text-muted-foreground">
                    {END_OF_LIST_BASE} {endOfListSuffix}
                  </div>
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

                {allNews.map((item) => (
                  <div
                    key={item.id}
                    className="hover-group hover-enabled p-2 rounded transition-colors border-b border-border/60 last:border-b-0 cursor-pointer"
                    onClick={() => {
                      if (item.url) window.open(item.url, "_blank", "noopener,noreferrer");
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === " ") && item.url) {
                        window.open(item.url, "_blank", "noopener,noreferrer");
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="hover-title text-xs sm:text-sm text-foreground transition-colors block">{item.title}</span>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          <span className="text-news-time tabular-nums">{item.time}</span>
                          <button
                            type="button"
                            className="px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wider font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCategory((prev) => (prev === item.category ? 'All News' : item.category));
                              setShowSavedOnly(false);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            title={`Filter by ${item.category}`}
                          >
                            {item.category}
                          </button>
                          <span>{item.sourceName}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="hidden sm:flex items-center gap-2">
                          {item.url ? (
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  if (navigator.share) {
                                    await navigator.share({ title: item.title, url: item.url });
                                  } else {
                                    await navigator.clipboard.writeText(item.url);
                                    window.dispatchEvent(
                                      new CustomEvent("show-toast", {
                                        detail: { message: "Link copied to clipboard" },
                                      }),
                                    );
                                  }
                                } catch {
                                  // ignore
                                }
                              }}
                              className="transition-colors"
                              title="Share article"
                            >
                              <Share2 className="h-4 w-4 text-muted-foreground hover:text-primary" />
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSaveArticle({
                                id: item.id,
                                title: item.title,
                                url: item.url,
                                publishedAt: item.publishedAt,
                                source: item.sourceName,
                                summary: item.summary,
                                category: item.category,
                              });
                            }}
                            className="transition-colors"
                            title={savedArticleTitles.includes(item.title) ? "Remove from saved" : "Save article"}
                          >
                            <Bookmark
                              className={`h-4 w-4 ${savedArticleTitles.includes(item.title)
                                ? "fill-primary text-primary"
                                : "text-muted-foreground hover:text-primary"
                                }`}
                            />
                          </button>
                        </div>

                        <div className="sm:hidden">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="transition-colors"
                                title="Actions"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4 text-muted-foreground hover:text-primary" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              {item.url ? (
                                <DropdownMenuItem
                                  onSelect={async () => {
                                    try {
                                      if (navigator.share) {
                                        await navigator.share({ title: item.title, url: item.url! });
                                      } else {
                                        await navigator.clipboard.writeText(item.url!);
                                        window.dispatchEvent(
                                          new CustomEvent("show-toast", {
                                            detail: { message: "Link copied to clipboard" },
                                          }),
                                        );
                                      }
                                    } catch {
                                      // ignore
                                    }
                                  }}
                                >
                                  Share
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuItem
                                onSelect={() =>
                                  toggleSaveArticle({
                                    id: item.id,
                                    title: item.title,
                                    url: item.url,
                                    publishedAt: item.publishedAt,
                                    source: item.sourceName,
                                    summary: item.summary,
                                    category: item.category,
                                  })
                                }
                              >
                                {savedArticleTitles.includes(item.title) ? "Remove saved" : "Save"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {shouldRenderInfiniteSentinel ? <div id="news-infinite-sentinel" className="h-8 w-full" /> : null}

                {!showSavedOnly && (selectedCategory === 'All News' ? infinite.isFetchingNextPage : categoryInfinite.isFetchingNextPage) ? (
                  <div className="px-2 py-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-block h-2 w-2 rounded-full bg-terminal-amber" />
                      <span>Loading more…</span>
                    </div>
                  </div>
                ) : null}

                {shouldShowEndMessage ? (
                  <div className="px-2 py-4 text-xs text-muted-foreground">
                    {END_OF_LIST_BASE} {endOfListSuffix}
                  </div>
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

              {allNews.map((item) => (
                <NewsCard
                  key={item.id}
                  title={item.title}
                  summary={item.summary}
                  source={item.sourceName}
                  time={item.time}
                  category={item.category}
                  url={item.url}
                  isSaved={savedArticleTitles.includes(item.title)}
                  onCategoryClick={(cat) => {
                    setSelectedCategory((prev) => (prev === cat ? 'All News' : cat));
                    setShowSavedOnly(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onToggleSave={() =>
                    toggleSaveArticle({
                      id: item.id,
                      title: item.title,
                      url: item.url,
                      publishedAt: item.publishedAt,
                      source: item.sourceName,
                      summary: item.summary,
                      category: item.category,
                    })
                  }
                  showSchemaButton={devShowSchemaButtons}
                  onShowSchema={showNewsItemSchema}
                />
              ))}

              {shouldRenderInfiniteSentinel ? <div id="news-infinite-sentinel" className="h-8 w-full" /> : null}

              {!showSavedOnly && (selectedCategory === 'All News' ? infinite.isFetchingNextPage : categoryInfinite.isFetchingNextPage) ? (
                <div className="col-span-full px-2 py-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-block h-2 w-2 rounded-full bg-terminal-amber" />
                    <span>Loading more…</span>
                  </div>
                </div>
              ) : null}

              {shouldShowEndMessage ? (
                <div className="col-span-full px-2 py-4 text-xs text-muted-foreground">
                  {END_OF_LIST_BASE} {endOfListSuffix}
                </div>
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
                activeSourceCount === totalSourceCount ? "text-terminal-green" : "text-terminal-amber"
              }
            >
              {/* Slight upward shift keeps the dot optically centered with the text */}
              <span className="inline-block -translate-y-[1px]">●</span>
            </span>
            <span className={activeSourceCount === totalSourceCount ? "text-terminal-green" : "text-muted-foreground"}>
              {activeSourceCount}/{totalSourceCount} Sources Active
            </span>
          </span>
          <span className="text-[10px] text-muted-foreground">
            {loadedArticlesCount} Articles Loaded
          </span>
        </div>
        <div className="flex items-center gap-3">
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
                <div className="text-xs text-muted-foreground">
                  Saved articles (localStorage): {savedArticles.length}
                </div>
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
        availableSources={availableSources}
        selectedSources={selectedSources}
        onSelectedSourcesChange={(next: SourceId[]) => {
          setSelectedSources(next);
        }}
        displayMode={displayMode}
        onDisplayModeChange={setDisplayMode}
        theme={theme}
        onThemeChange={handleThemeChange}
      />
    </div>
  );
};

export default Index;
