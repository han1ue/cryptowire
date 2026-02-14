import { Header } from "@/components/Header";
import { PriceBar } from "@/components/PriceBar";
import { NewsTicker } from "@/components/NewsTicker";
import { Sidebar } from "@/components/Sidebar";
import { SettingsDialog } from "@/components/SettingsDialog";
import { SourcesDialog } from "@/components/SourcesDialog";
import { NewsCard } from "@/components/NewsCard";
import { ShareMenu } from "@/components/ShareMenu";
import { sources as sourcesConfig, SourceId } from "@/data/sources";
import { useInfiniteNews } from "@/hooks/useInfiniteNews";
import { useSavedArticles } from "@/hooks/useSavedArticles";
import { useRecentArticles } from "@/hooks/useRecentArticles";
import { useNewsStatus } from "@/hooks/useNewsStatus";
import { useNewsCategories } from "@/hooks/useNewsCategories";
import { isUrlVisited, markUrlVisited } from "@/lib/visitedLinks";
import { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "@/components/ui/sonner";
import { Bookmark, Clock, MoreVertical, Share2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Seo } from "@/components/Seo";
import { useNavigate } from "react-router-dom";

const SOURCES_INTRO_DISMISSED_KEY = "sourcesIntroDismissed";
const EXCLUDED_CATEGORY_KEY = "cryptocurrency";

const normalizeCategoriesForUi = (raw: unknown, fallback = "News"): string[] => {
  const arr = Array.isArray(raw) ? raw : [];
  const normalized = arr
    .map((c) => (typeof c === "string" ? c.trim() : ""))
    .filter((c) => c.length > 0 && c.toLowerCase() !== EXCLUDED_CATEGORY_KEY);
  const deduped = Array.from(new Set(normalized));
  return deduped.length > 0 ? deduped : [fallback];
};

type MobileActionsMenuProps = {
  shareUrl?: string;
  shareTitle?: string;
  onToggleSave: () => void;
  isSaved: boolean;
};

const MobileActionsMenu = ({ shareUrl, shareTitle, onToggleSave, isSaved }: MobileActionsMenuProps) => {
  const [open, setOpen] = useState(false);

  const buildShareText = (title?: string) => {
    const base = "via cryptowi.re";
    if (!title) return base;
    return `${title} ${base}`;
  };

  const openShareWindow = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    if (!open) return;

    const close = () => setOpen(false);
    window.addEventListener("scroll", close, { capture: true, passive: true });
    window.addEventListener("touchmove", close, { capture: true, passive: true });
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("touchmove", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <div className="sm:hidden">
      <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="transition-colors"
            title="Actions"
            onClick={(e) => e.stopPropagation()}
            aria-expanded={open}
            aria-haspopup="menu"
          >
            <MoreVertical className="h-4 w-4 text-muted-foreground hover:text-primary" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          {shareUrl ? (
            <>
              <DropdownMenuItem
                onSelect={async () => {
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                    window.dispatchEvent(new CustomEvent("show-toast", { detail: { message: "Link copied to clipboard" } }));
                  } catch {
                    // ignore
                  } finally {
                    setOpen(false);
                  }
                }}
              >
                Copy link
              </DropdownMenuItem>

              {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
                <DropdownMenuItem
                  onSelect={async () => {
                    try {
                      await navigator.share({
                        title: shareTitle,
                        text: buildShareText(shareTitle),
                        url: shareUrl,
                      });
                    } catch {
                      // ignore
                    } finally {
                      setOpen(false);
                    }
                  }}
                >
                  Share…
                </DropdownMenuItem>
              ) : null}

              <DropdownMenuItem
                onSelect={() => {
                  const encodedUrl = encodeURIComponent(shareUrl);
                  const encodedTitle = encodeURIComponent(buildShareText(shareTitle));
                  openShareWindow(`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`);
                  setOpen(false);
                }}
              >
                Share on X
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  const encodedUrl = encodeURIComponent(shareUrl);
                  const encodedTitle = encodeURIComponent(buildShareText(shareTitle));
                  openShareWindow(`https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`);
                  setOpen(false);
                }}
              >
                Share on Reddit
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  const encodedUrl = encodeURIComponent(shareUrl);
                  openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`);
                  setOpen(false);
                }}
              >
                Share on Facebook
              </DropdownMenuItem>
            </>
          ) : null}
          <DropdownMenuItem
            onSelect={() => {
              onToggleSave();
              setOpen(false);
            }}
          >
            {isSaved ? "Remove saved" : "Save"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

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
  const [_visitedVersion, setVisitedVersion] = useState(0);

  useEffect(() => {
    const onVisitedChanged = () => setVisitedVersion((v) => v + 1);
    window.addEventListener("cw:visited-changed", onVisitedChanged);
    return () => window.removeEventListener("cw:visited-changed", onVisitedChanged);
  }, []);
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
  const categoriesQuery = useNewsCategories({ sources: selectedSources });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
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
  const {
    savedArticles,
    savedTitles: savedArticleTitles,
    isSavedInput,
    toggleSaved: toggleSaveArticle,
  } = useSavedArticles();
  const { recentArticles, addRecent } = useRecentArticles();
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [showRecentOnly, setShowRecentOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All News');

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
    try {
      const saved = localStorage.getItem("notifications");
      if (!saved) return initialNotifications;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return initialNotifications;
      const out: NotificationItem[] = [];
      for (const row of parsed as unknown[]) {
        if (!row || typeof row !== "object") continue;
        const r = row as Record<string, unknown>;
        const id = typeof r.id === "string" ? r.id : "";
        const title = typeof r.title === "string" ? r.title : "";
        const message = typeof r.message === "string" ? r.message : "";
        const time = typeof r.time === "string" ? r.time : "";
        const read = typeof r.read === "boolean" ? r.read : false;
        if (!id || !title || !message || !time) continue;
        out.push({ id, title, message, time, read });
      }
      return out.length > 0 ? out : initialNotifications;
    } catch {
      return initialNotifications;
    }
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedLineCategoriesById, setExpandedLineCategoriesById] = useState<Record<string, boolean>>({});

  const [showSourcesIntro, setShowSourcesIntro] = useState(() => {
    try {
      return localStorage.getItem(SOURCES_INTRO_DISMISSED_KEY) !== "true";
    } catch {
      return true;
    }
  });

  const dismissSourcesIntro = () => {
    setShowSourcesIntro(false);
    try {
      localStorage.setItem(SOURCES_INTRO_DISMISSED_KEY, "true");
    } catch {
      // ignore
    }
  };

  const selectedCategoryKey = selectedCategory && selectedCategory !== "All News" ? selectedCategory : null;

  const selectedCategoryKeyLower = selectedCategoryKey ? selectedCategoryKey.trim().toLowerCase() : null;

  const getCategoryForDisplay = (item: { categories?: string[] }): string => {
    const cats = normalizeCategoriesForUi(item.categories);

    if (selectedCategoryKeyLower) {
      const match = cats.find((c) => c.toLowerCase() === selectedCategoryKeyLower);
      if (match) return match;
    }

    return cats[0] ?? "News";
  };

  const filteredCategoryOptions = useMemo(
    () =>
      (categoriesQuery.data?.categories ?? [])
        .map((c) => c.trim())
        .filter((c) => c.length > 0 && c.toLowerCase() !== EXCLUDED_CATEGORY_KEY),
    [categoriesQuery.data?.categories],
  );

  useEffect(() => {
    if (!selectedCategoryKey) return;
    if (selectedCategoryKey.trim().toLowerCase() === EXCLUDED_CATEGORY_KEY) {
      setSelectedCategory("All News");
      return;
    }
    if (filteredCategoryOptions.length === 0) return;
    const exists = filteredCategoryOptions.some((c) => c.toLowerCase() === selectedCategoryKey.trim().toLowerCase());
    if (!exists) setSelectedCategory("All News");
  }, [selectedCategoryKey, filteredCategoryOptions]);

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
  const selectedSourcesKey = selectedSources.join("|");
  useEffect(() => {
    setEndOfListSuffix("");
    setExpandedLineCategoriesById({});
  }, [showSavedOnly, showRecentOnly, selectedCategory, selectedSourcesKey]);

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
    if (showSavedOnly || showRecentOnly) return;
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
    showRecentOnly,
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
      const normalizedCategories = normalizeCategoriesForUi([a.category ?? "News"]);
      return {
        id: a.key,
        title: a.title,
        summary: a.summary || "",
        time: formatDistanceToNow(new Date(publishedAt), { addSuffix: true }).replace(/^about /, ""),
        category: normalizedCategories[0],
        categories: normalizedCategories,
        url: a.url,
        isBreaking: false,
        publishedAt,
        sourceName: a.source ?? "Saved",
      };
    });

  const recentOnlyNews = recentArticles
    .filter((a) => {
      const sourceName = a.source ?? "";
      if (!sourceName) return true;
      const id = sourceNameToId.get(sourceName.toLowerCase());
      if (!id) return true;
      return selectedSources.includes(id);
    })
    .map((a) => {
      const publishedAt = a.clickedAt;
      const category = (a.category ?? "News") || "News";
      const normalizedCategories = normalizeCategoriesForUi([category]);
      return {
        id: a.key,
        title: a.title,
        summary: a.summary || "",
        time: formatDistanceToNow(new Date(publishedAt), { addSuffix: true }).replace(/^about /, ""),
        category: normalizedCategories[0],
        categories: normalizedCategories,
        url: a.url,
        isBreaking: false,
        publishedAt,
        sourceName: a.source ?? "Recent",
      };
    });

  const allNews = (showSavedOnly ? savedOnlyNews : showRecentOnly ? recentOnlyNews : filteredBySource)
    .map((n) => {
      if (showSavedOnly || showRecentOnly) return n;
      const normalizedCategories = normalizeCategoriesForUi(
        Array.isArray(n.categories) && n.categories.length > 0 ? n.categories : [getCategoryForDisplay(n)],
      );
      return {
        id: n.id,
        title: n.title,
        summary: n.summary || "",
        time: formatDistanceToNow(new Date(n.publishedAt), { addSuffix: true }).replace(/^about /, ""),
        category: normalizedCategories[0] ?? getCategoryForDisplay(n),
        categories: normalizedCategories,
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
      const normalizedCategories = normalizeCategoriesForUi(
        Array.isArray(n.categories) && n.categories.length > 0 ? n.categories : [getCategoryForDisplay(n)],
      );
      return {
        id: n.id,
        title: n.title,
        summary: n.summary || "",
        time: formatDistanceToNow(new Date(n.publishedAt), { addSuffix: true }).replace(/^about /, ""),
        category: normalizedCategories[0] ?? getCategoryForDisplay(n),
        categories: normalizedCategories,
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

  const openSourcesDialog = () => {
    setSettingsOpen(false);
    setSourcesOpen(true);
  };

  const openSettingsDialog = () => {
    setSourcesOpen(false);
    setSettingsOpen(true);
  };

  const clearLocalStorage = () => {
    localStorage.clear();
    window.location.reload();
  };

  const isFetchingNext = selectedCategory === 'All News'
    ? infinite.isFetchingNextPage
    : categoryInfinite.isFetchingNextPage;
  const hasNextPage = selectedCategory === 'All News'
    ? infinite.hasNextPage
    : categoryInfinite.hasNextPage;
  const shouldShowEndMessage =
    !showSavedOnly &&
    !showRecentOnly &&
    selectedCategory === 'All News' &&
    !isFetchingNext &&
    allNews.length > 0 &&
    !hasNextPage;

  const shouldRenderInfiniteSentinel = !showSavedOnly && !showRecentOnly && (hasNextPage ?? true);

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
        onSettingsClick={openSettingsDialog}
        onSourcesClick={openSourcesDialog}
        activeSourceCount={activeSourceCount}
        totalSourceCount={totalSourceCount}
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
              setShowSavedOnly((prev) => !prev);
              setShowRecentOnly(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            savedArticles={savedArticles}
            recentArticlesCount={recentArticles.length}
            recentArticles={recentArticles}
            showRecentOnly={showRecentOnly}
            onToggleRecentView={() => {
              setShowRecentOnly((prev) => !prev);
              setShowSavedOnly(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            allNews={sidebarNews}
            categories={filteredCategoryOptions}
            selectedCategory={selectedCategory}
            onCategorySelect={cat => {
              setSelectedCategory((prev) => (prev === cat ? 'All News' : cat));
              setShowSavedOnly(false);
              setShowRecentOnly(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSourcesClick={openSourcesDialog}
            activeSourceCount={activeSourceCount}
            totalSourceCount={totalSourceCount}
            loadedArticlesCount={loadedArticlesCount}
            appVersion="1.2.0"
            lastRefreshAt={newsStatus.data?.lastRefreshAt ?? null}
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
                  setShowSavedOnly((prev) => !prev);
                  setShowRecentOnly(false);
                  setSidebarOpen(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                savedArticles={savedArticles}
                recentArticlesCount={recentArticles.length}
                recentArticles={recentArticles}
                showRecentOnly={showRecentOnly}
                onToggleRecentView={() => {
                  setShowRecentOnly((prev) => !prev);
                  setShowSavedOnly(false);
                  setSidebarOpen(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                allNews={sidebarNews}
                categories={filteredCategoryOptions}
                selectedCategory={selectedCategory}
                onCategorySelect={cat => {
                  setSelectedCategory((prev) => (prev === cat ? 'All News' : cat));
                  setShowSavedOnly(false);
                  setShowRecentOnly(false);
                  setSidebarOpen(false);
                }}
                onSourcesClick={() => {
                  setSidebarOpen(false);
                  openSourcesDialog();
                }}
                activeSourceCount={activeSourceCount}
                totalSourceCount={totalSourceCount}
                loadedArticlesCount={loadedArticlesCount}
                appVersion="1.2.0"
                lastRefreshAt={newsStatus.data?.lastRefreshAt ?? null}
              />
            </div>
          </>
        )}

        <main
          className={`flex-1 ${displayMode === "cards" ? "p-2 sm:p-4" : "px-0 py-2 sm:p-4"}`}
        >
          {showSavedOnly || showRecentOnly ? (
            <div className="mb-2 px-2 sm:px-0">
              <button
                type="button"
                onClick={() => {
                  setShowSavedOnly(false);
                  setShowRecentOnly(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center border border-border rounded px-2.5 py-1.5 text-[12px] font-medium uppercase tracking-wider text-muted-foreground bg-card/30 hover:bg-card/40 hover:text-foreground transition-colors"
              >
                <span className="text-[12px] leading-none relative -top-px">‹</span>
                <span className="ml-1">Back</span>
              </button>
            </div>
          ) : null}

          {!showSavedOnly && !showRecentOnly && showSourcesIntro ? (
            <div className="mb-2 sm:mb-4 relative">
              <button
                type="button"
                className="w-full text-left bg-muted/20 hover:bg-muted/30 border border-border rounded px-3 py-2.5 pr-10 transition-colors"
                onClick={openSourcesDialog}
              >
                <div className="text-xs text-muted-foreground">
                  News sources: <span className="text-foreground">{selectedSources.length}/{availableSources.length}</span> active.
                  <span className="text-primary"> Manage sources</span>.
                </div>
              </button>
              <button
                type="button"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded text-lg leading-none text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissSourcesIntro();
                }}
                aria-label="Dismiss"
                title="Dismiss"
              >
                ×
              </button>
            </div>
          ) : null}

          {/* Category Tag - above news, smaller, left-aligned */}
          {!showSavedOnly && !showRecentOnly && selectedCategoryKey && (
            <div className="mb-2 flex px-2">
              <span className="inline-flex items-center px-2 py-1 rounded bg-primary/10 text-primary text-sm font-medium uppercase tracking-wider">
                {selectedCategoryKey}
                <button
                  type="button"
                  className="ml-2 text-sm text-primary-foreground bg-primary/40 rounded-full w-4 h-4 flex items-center justify-center hover:bg-primary/70 transition-colors"
                  style={{ lineHeight: 1 }}
                  aria-label="Clear category filter"
                  title="Clear category filter"
                  onClick={() => setSelectedCategory('All News')}
                >
                  ×
                </button>
              </span>
            </div>
          )}

          {!showSavedOnly && !showRecentOnly && selectedSources.length === 0 ? (
            <div className="flex-1 flex items-center justify-center bg-card/30 border border-border rounded p-12 sm:p-20">
              <div className="text-center text-muted-foreground">
                <p className="text-sm">Please select some sources to get the latest news</p>
                <button
                  type="button"
                  onClick={openSourcesDialog}
                  className="mt-4 px-3 py-2 text-xs font-medium uppercase tracking-wider transition-colors bg-primary text-primary-foreground"
                >
                  Select sources
                </button>
              </div>
            </div>
          ) : !showSavedOnly && !showRecentOnly && selectedSources.length > 0 && allNews.length === 0 && !(
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
                  onClick={openSourcesDialog}
                  className="mt-4 px-3 py-2 text-xs font-medium uppercase tracking-wider transition-colors bg-primary text-primary-foreground"
                >
                  Edit sources
                </button>
              </div>
            </div>
          ) : allNews.length === 0 && showRecentOnly ? (
            <div className="flex-1 flex items-center justify-center bg-card/30 border border-border rounded p-12 sm:p-20">
              <div className="text-center text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Nothing viewed yet</p>
                <p className="text-xs mt-2">Open any article and it will appear here</p>
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
                {(infinite.isLoading || infinite.isFetching) && allNews.length === 0 && !showSavedOnly && !showRecentOnly ? (
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
                      if (item.url) {
                        addRecent({
                          title: item.title,
                          url: item.url,
                          source: item.sourceName,
                          summary: item.summary,
                          category: item.category,
                        });
                        markUrlVisited(item.url);
                        window.open(item.url, "_blank", "noopener,noreferrer");
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === " ") && item.url) {
                        addRecent({
                          title: item.title,
                          url: item.url,
                          source: item.sourceName,
                          summary: item.summary,
                          category: item.category,
                        });
                        markUrlVisited(item.url);
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
                            <span
                              className={`hover-title text-[11px] sm:text-xs leading-snug transition-colors block line-clamp-2 cw-title ${!showRecentOnly && item.url && isUrlVisited(item.url) ? "cw-title--visited" : ""}`}
                            >
                              <span>{item.title}</span>
                              <span className="text-[10px] text-muted-foreground">&nbsp;·&nbsp;{item.sourceName}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="hidden sm:flex items-center gap-2">
                          {item.url ? (
                            <ShareMenu url={item.url} title={item.title}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                className="transition-colors"
                                title="Share article"
                              >
                                <Share2 className="h-4 w-4 text-muted-foreground hover:text-primary" />
                              </button>
                            </ShareMenu>
                          ) : null}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSaveArticle({
                                id: showSavedOnly
                                  ? item.id?.startsWith("id:")
                                    ? item.id.slice("id:".length)
                                    : undefined
                                  : item.id,
                                title: item.title,
                                url: item.url,
                                publishedAt: item.publishedAt,
                                source: item.sourceName,
                                summary: item.summary,
                                category: item.category,
                              });
                            }}
                            className="transition-colors"
                            title={
                              isSavedInput({
                                id: showSavedOnly
                                  ? item.id?.startsWith("id:")
                                    ? item.id.slice("id:".length)
                                    : undefined
                                  : item.id,
                                title: item.title,
                                url: item.url,
                                publishedAt: item.publishedAt,
                              })
                                ? "Remove from saved"
                                : "Save article"
                            }
                          >
                            <Bookmark
                              className={`h-4 w-4 ${isSavedInput({
                                id: showSavedOnly
                                  ? item.id?.startsWith("id:")
                                    ? item.id.slice("id:".length)
                                    : undefined
                                  : item.id,
                                title: item.title,
                                url: item.url,
                                publishedAt: item.publishedAt,
                              })
                                ? "fill-primary text-primary"
                                : "text-muted-foreground hover:text-primary"
                                }`}
                            />
                          </button>
                        </div>

                        <MobileActionsMenu
                          shareUrl={item.url}
                          shareTitle={item.title}
                          onToggleSave={() =>
                            toggleSaveArticle({
                              id: showSavedOnly
                                ? item.id?.startsWith("id:")
                                  ? item.id.slice("id:".length)
                                  : undefined
                                : item.id,
                              title: item.title,
                              url: item.url,
                              publishedAt: item.publishedAt,
                              source: item.sourceName,
                              summary: item.summary,
                              category: item.category,
                            })
                          }
                          isSaved={
                            isSavedInput({
                              id: showSavedOnly
                                ? item.id?.startsWith("id:")
                                  ? item.id.slice("id:".length)
                                  : undefined
                                : item.id,
                              title: item.title,
                              url: item.url,
                              publishedAt: item.publishedAt,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {shouldRenderInfiniteSentinel ? <div id="news-infinite-sentinel" className="h-8 w-full" /> : null}

                {!showSavedOnly && !showRecentOnly && (selectedCategory === 'All News' ? infinite.isFetchingNextPage : categoryInfinite.isFetchingNextPage) ? (
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
                {(infinite.isLoading || infinite.isFetching) && allNews.length === 0 && !showSavedOnly && !showRecentOnly ? (
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
                      if (item.url) {
                        addRecent({
                          title: item.title,
                          url: item.url,
                          source: item.sourceName,
                          summary: item.summary,
                          category: item.category,
                        });
                        markUrlVisited(item.url);
                        window.open(item.url, "_blank", "noopener,noreferrer");
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === " ") && item.url) {
                        addRecent({
                          title: item.title,
                          url: item.url,
                          source: item.sourceName,
                          summary: item.summary,
                          category: item.category,
                        });
                        markUrlVisited(item.url);
                        window.open(item.url, "_blank", "noopener,noreferrer");
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span
                          className={`hover-title text-xs sm:text-sm transition-colors block cw-title ${!showRecentOnly && item.url && isUrlVisited(item.url) ? "cw-title--visited" : ""}`}
                        >
                          {item.title}
                        </span>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          <span className="text-news-time tabular-nums">{item.time}</span>
                          {(() => {
                            const lineCategories = normalizeCategoriesForUi(
                              Array.isArray(item.categories) ? item.categories : [item.category ?? "News"],
                            );
                            const expanded = Boolean(expandedLineCategoriesById[item.id]);
                            const visibleCategories = expanded ? lineCategories : lineCategories.slice(0, 3);
                            const hiddenCount = Math.max(0, lineCategories.length - visibleCategories.length);
                            return (
                              <>
                                {visibleCategories.map((cat) => (
                                  <button
                                    key={cat}
                                    type="button"
                                    className="px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wider font-medium"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCategory((prev) => (prev === cat ? 'All News' : cat));
                                      setShowSavedOnly(false);
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    title={`Filter by ${cat}`}
                                  >
                                    {cat}
                                  </button>
                                ))}
                                {hiddenCount > 0 ? (
                                  <button
                                    type="button"
                                    className="px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wider font-medium"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedLineCategoriesById((prev) => ({ ...prev, [item.id]: true }));
                                    }}
                                    title={`Show ${hiddenCount} more categories`}
                                  >
                                    +{hiddenCount}
                                  </button>
                                ) : null}
                              </>
                            );
                          })()}
                          <span>{item.sourceName}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="hidden sm:flex items-center gap-2">
                          {item.url ? (
                            <ShareMenu url={item.url} title={item.title}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                className="transition-colors"
                                title="Share article"
                              >
                                <Share2 className="h-4 w-4 text-muted-foreground hover:text-primary" />
                              </button>
                            </ShareMenu>
                          ) : null}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSaveArticle({
                                id: showSavedOnly
                                  ? item.id?.startsWith("id:")
                                    ? item.id.slice("id:".length)
                                    : undefined
                                  : item.id,
                                title: item.title,
                                url: item.url,
                                publishedAt: item.publishedAt,
                                source: item.sourceName,
                                summary: item.summary,
                                category: item.category,
                              });
                            }}
                            className="transition-colors"
                            title={
                              isSavedInput({
                                id: showSavedOnly
                                  ? item.id?.startsWith("id:")
                                    ? item.id.slice("id:".length)
                                    : undefined
                                  : item.id,
                                title: item.title,
                                url: item.url,
                                publishedAt: item.publishedAt,
                              })
                                ? "Remove from saved"
                                : "Save article"
                            }
                          >
                            <Bookmark
                              className={`h-4 w-4 ${isSavedInput({
                                id: showSavedOnly
                                  ? item.id?.startsWith("id:")
                                    ? item.id.slice("id:".length)
                                    : undefined
                                  : item.id,
                                title: item.title,
                                url: item.url,
                                publishedAt: item.publishedAt,
                              })
                                ? "fill-primary text-primary"
                                : "text-muted-foreground hover:text-primary"
                                }`}
                            />
                          </button>
                        </div>

                        <MobileActionsMenu
                          shareUrl={item.url}
                          shareTitle={item.title}
                          onToggleSave={() =>
                            toggleSaveArticle({
                              id: showSavedOnly
                                ? item.id?.startsWith("id:")
                                  ? item.id.slice("id:".length)
                                  : undefined
                                : item.id,
                              title: item.title,
                              url: item.url,
                              publishedAt: item.publishedAt,
                              source: item.sourceName,
                              summary: item.summary,
                              category: item.category,
                            })
                          }
                          isSaved={
                            isSavedInput({
                              id: showSavedOnly
                                ? item.id?.startsWith("id:")
                                  ? item.id.slice("id:".length)
                                  : undefined
                                : item.id,
                              title: item.title,
                              url: item.url,
                              publishedAt: item.publishedAt,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {shouldRenderInfiniteSentinel ? <div id="news-infinite-sentinel" className="h-8 w-full" /> : null}

                {!showSavedOnly && !showRecentOnly && (selectedCategory === 'All News' ? infinite.isFetchingNextPage : categoryInfinite.isFetchingNextPage) ? (
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
              {(infinite.isLoading || infinite.isFetching) && allNews.length === 0 && !showSavedOnly && !showRecentOnly ? (
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
                  categories={item.categories}
                  url={item.url}
                  disableVisitedStyling={showRecentOnly}
                  isSaved={savedArticleTitles.includes(item.title)}
                  onCategoryClick={(cat) => {
                    setSelectedCategory((prev) => (prev === cat ? 'All News' : cat));
                    setShowSavedOnly(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onToggleSave={() =>
                    toggleSaveArticle({
                      id: showSavedOnly
                        ? item.id?.startsWith("id:")
                          ? item.id.slice("id:".length)
                          : undefined
                        : item.id,
                      title: item.title,
                      url: item.url,
                      publishedAt: item.publishedAt,
                      source: item.sourceName,
                      summary: item.summary,
                      category: item.category,
                    })
                  }
                />
              ))}

              {shouldRenderInfiniteSentinel ? <div id="news-infinite-sentinel" className="h-8 w-full" /> : null}

              {!showSavedOnly && !showRecentOnly && (selectedCategory === 'All News' ? infinite.isFetchingNextPage : categoryInfinite.isFetchingNextPage) ? (
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

      <SourcesDialog
        open={sourcesOpen}
        onOpenChange={setSourcesOpen}
        availableSources={availableSources}
        selectedSources={selectedSources}
        onSelectedSourcesChange={setSelectedSources}
      />

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        displayMode={displayMode}
        onDisplayModeChange={setDisplayMode}
        theme={theme}
        onThemeChange={handleThemeChange}
        onClearLocalStorage={clearLocalStorage}
      />
    </div>
  );
};

export default Index;
