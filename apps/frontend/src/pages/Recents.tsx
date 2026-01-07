import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { NewsCard } from "@/components/NewsCard";
import { PriceBar } from "@/components/PriceBar";
import { NewsTicker } from "@/components/NewsTicker";
import { Seo } from "@/components/Seo";
import { sources as sourcesConfig, SourceId } from "@/data/sources";
import { useNewsCategories } from "@/hooks/useNewsCategories";
import { useNewsStatus } from "@/hooks/useNewsStatus";
import { useRecentArticles } from "@/hooks/useRecentArticles";
import { useSavedArticles } from "@/hooks/useSavedArticles";
import { formatDistanceToNow } from "date-fns";
import { Clock } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const NAVIGATE_CATEGORY_KEY = "cw:navigate:category";
const NAVIGATE_SAVED_ONLY_KEY = "cw:navigate:savedOnly";

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
    return Array.from(new Set(normalized)).filter(isSourceId);
};

const Recents = () => {
    const navigate = useNavigate();
    const newsStatus = useNewsStatus();
    const { recentArticles } = useRecentArticles();
    const { savedArticles, isSavedInput, toggleSaved } = useSavedArticles();

    const [selectedSources] = useState<SourceId[]>(() => {
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

    const categoriesQuery = useNewsCategories({ sources: selectedSources });
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const goToCategoryOnHome = (cat: string) => {
        try {
            localStorage.setItem(NAVIGATE_CATEGORY_KEY, cat);
            localStorage.removeItem(NAVIGATE_SAVED_ONLY_KEY);
        } catch {
            // ignore
        }
        navigate("/");
    };

    const goToSavedOnHome = () => {
        try {
            localStorage.setItem(NAVIGATE_SAVED_ONLY_KEY, "1");
            localStorage.removeItem(NAVIGATE_CATEGORY_KEY);
        } catch {
            // ignore
        }
        navigate("/");
    };

    const cards = useMemo(() => {
        return recentArticles.map((a) => {
            const time = formatDistanceToNow(new Date(a.clickedAt), { addSuffix: true }).replace(/^about /, "");
            return {
                key: a.key,
                title: a.title,
                url: a.url,
                source: a.source ?? "News",
                summary: a.summary ?? "",
                category: a.category,
                time,
            };
        });
    }, [recentArticles]);

    return (
        <div className="min-h-screen bg-background flex flex-col scanlines overflow-x-hidden">
            <Seo
                title="cryptowi.re | Recent Articles"
                description="Your recently opened crypto articles on cryptowi.re."
                canonicalPath="/recents"
            />

            <h1 className="sr-only">cryptowi.re — Recent Articles</h1>

            <Header
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
                        onToggleSavedView={() => {
                            goToSavedOnHome();
                            window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        savedArticles={savedArticles}
                        categories={categoriesQuery.data?.categories ?? []}
                        selectedCategory={"All News"}
                        onCategorySelect={(cat) => {
                            goToCategoryOnHome(cat);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        recentArticlesCount={recentArticles.length}
                        recentArticles={recentArticles}
                        isRecentsPage
                        onNavigateRecents={() => {
                            window.scrollTo({ top: 0, behavior: "smooth" });
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
                                onToggleSavedView={() => {
                                    setSidebarOpen(false);
                                    goToSavedOnHome();
                                }}
                                savedArticles={savedArticles}
                                categories={categoriesQuery.data?.categories ?? []}
                                selectedCategory={"All News"}
                                onCategorySelect={(cat) => {
                                    setSidebarOpen(false);
                                    goToCategoryOnHome(cat);
                                }}
                                recentArticlesCount={recentArticles.length}
                                recentArticles={recentArticles}
                                isRecentsPage
                                onNavigateRecents={() => {
                                    setSidebarOpen(false);
                                    window.scrollTo({ top: 0, behavior: "smooth" });
                                }}
                            />
                        </div>
                    </>
                )}

                <main className="flex-1 p-2 sm:p-4">
                    <div className="mb-3 px-2 sm:px-0">
                        <button
                            type="button"
                            onClick={() => navigate("/")}
                            className="inline-flex items-center border border-border rounded px-2.5 py-1.5 text-[12px] font-medium uppercase tracking-wider text-muted-foreground bg-card/30 hover:bg-card/40 hover:text-foreground transition-colors"
                        >
                            <span className="text-[12px] leading-none relative -top-px">‹</span>
                            <span className="ml-1">Back</span>
                        </button>
                    </div>

                    <div className="px-2 sm:px-0 mb-2">
                        <div className="text-xs font-medium uppercase tracking-wider text-foreground">Recent Articles</div>
                        <div className="text-xs text-muted-foreground">Last articles you opened</div>
                    </div>

                    {cards.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center bg-card/30 border border-border rounded p-12 sm:p-20">
                            <div className="text-center text-muted-foreground">
                                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p className="text-sm">No recent articles yet</p>
                                <p className="text-xs mt-2">Open any article and it will appear here</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                            {cards.map((n) => (
                                <NewsCard
                                    key={n.key}
                                    title={n.title}
                                    summary={n.summary}
                                    source={n.source}
                                    time={n.time}
                                    category={n.category}
                                    url={n.url}
                                    isSaved={isSavedInput({ title: n.title, url: n.url, source: n.source, summary: n.summary, category: n.category })}
                                    onToggleSave={() =>
                                        toggleSaved({ title: n.title, url: n.url, source: n.source, summary: n.summary, category: n.category })
                                    }
                                />
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default Recents;
