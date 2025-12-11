import { Header } from "@/components/Header";
import { PriceBar } from "@/components/PriceBar";
import { NewsTicker } from "@/components/NewsTicker";
import { Sidebar } from "@/components/Sidebar";
import { SettingsDialog } from "@/components/SettingsDialog";
import { NewsCard } from "@/components/NewsCard";
import { sources } from "@/data/mockNews";
import { useState, useEffect } from "react";
import { toast } from "@/components/ui/sonner";
import { Bookmark, Share2 } from "lucide-react";

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
    return saved ? JSON.parse(saved) : sources.map(s => s.name);
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("theme");
    return saved === "light" ? "light" : "dark";
  });
  const [lineView, setLineView] = useState(() => {
    const saved = localStorage.getItem("lineView");
    return saved ? JSON.parse(saved) : true;
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
    localStorage.setItem("lineView", JSON.stringify(lineView));
  }, [lineView]);
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

  const activeSources = sources.filter(source => selectedSources.includes(source.name));

  let allNews = activeSources
    .flatMap(source =>
      source.news.map(item => ({ ...item, sourceName: source.name, sourceIcon: source.icon }))
    )
    .sort((a, b) => {
      const parseTime = (timeStr: string) => {
        if (timeStr.includes('Just now')) return 0;
        if (timeStr.includes('min ago')) return parseInt(timeStr) * 60;
        if (timeStr.includes('hour ago')) return parseInt(timeStr) * 3600;
        return 999999; // fallback
      };
      return parseTime(a.time) - parseTime(b.time);
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

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
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

        <main className="flex-1 p-4 overflow-hidden">
          {allNews.length === 0 && showSavedOnly ? (
            <div className="flex-1 flex items-center justify-center bg-card/30 border border-border rounded p-12 sm:p-20">
              <div className="text-center text-muted-foreground">
                <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No saved articles yet</p>
                <p className="text-xs mt-2">Click the bookmark icon on any article to save it</p>
              </div>
            </div>
          ) : lineView ? (
            <div className="flex-1 overflow-y-auto p-2 sm:p-4 bg-card/30 border border-border rounded">
              <div className="space-y-2">
                {allNews.map((item, index) => (
                  <div
                    key={index}
                    className="group hover:bg-muted/30 p-2 rounded transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {item.url ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors block"
                            onClick={e => e.stopPropagation()}
                          >
                            {item.title}
                          </a>
                        ) : (
                          <span className="text-xs sm:text-sm text-foreground block">{item.title}</span>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          <span className="text-terminal-green tabular-nums">
                            {item.time}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wider font-medium">
                            {item.category}
                          </span>
                          <span>{item.sourceName}</span>
                        </div>
                      </div>
                      <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 flex-col sm:flex-row">
                        {item.url && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (navigator.share) {
                                try {
                                  await navigator.share({ title: item.title, url: item.url });
                                } catch { }
                              } else {
                                await navigator.clipboard.writeText(item.url);
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
                              : "text-muted-foreground hover:text-primary"
                              }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 overflow-y-auto">
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
                />
              ))}
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
                activeSources.length === sources.length ? "text-terminal-green" : "text-terminal-amber"
              }
            >
              {/* Slight upward shift keeps the dot optically centered with the text */}
              <span className="inline-block -translate-y-[1px]">●</span>
            </span>
            <span className={activeSources.length === sources.length ? "text-terminal-green" : "text-muted-foreground"}>
              {activeSources.length}/{sources.length} Sources Active
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
          <span className="text-[10px] text-muted-foreground">v1.0.0</span>
        </div>
      </footer>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        selectedSources={selectedSources}
        onSelectedSourcesChange={setSelectedSources}
        lineView={lineView}
        onLineViewChange={setLineView}
        theme={theme}
        onThemeChange={setTheme}
      />
    </div>
  );
};

export default Index;
