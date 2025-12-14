import { Header } from "@/components/Header";
import { Seo } from "@/components/Seo";
import { fetchArticle } from "@/lib/apiClient";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import DOMPurify from "dompurify";
import { ArrowLeft, Bookmark, Share2, ExternalLink } from "lucide-react";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSavedArticles } from "@/hooks/useSavedArticles";

const Article = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { savedTitles, toggleSaved } = useSavedArticles();

    const query = useQuery({
        queryKey: ["article", id],
        queryFn: async () => {
            if (!id) throw new Error("Missing article id");
            return await fetchArticle(id);
        },
        enabled: Boolean(id),
    });

    const article = query.data?.article;
    const isSaved = article ? savedTitles.includes(article.title) : false;

    const safeHtml = useMemo(() => {
        if (!article?.contentHtml) return null;
        return DOMPurify.sanitize(article.contentHtml, { USE_PROFILES: { html: true } });
    }, [article?.contentHtml]);

    const title = article?.title ? `${article.title} | cryptowi.re` : "Article | cryptowi.re";
    const description = article?.excerpt ?? article?.textContent?.slice(0, 160) ?? "";

    return (
        <div className="min-h-screen bg-background flex flex-col scanlines overflow-x-hidden">
            <Seo title={title} description={description} canonicalPath={id ? `/article/${id}` : "/"} />

            <Header
                onMenuClick={() => {
                    navigate("/");
                }}
            />

            <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <button
                            type="button"
                            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => navigate(-1)}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span>Back</span>
                        </button>

                        <div className="flex items-center gap-2">
                            {article?.url ? (
                                <a
                                    href={article.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded border border-border bg-card/40 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                    title="Open original"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    <span className="hidden sm:inline">Original</span>
                                </a>
                            ) : null}

                            <button
                                type="button"
                                className="inline-flex items-center gap-2 rounded border border-border bg-card/40 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                onClick={async () => {
                                    if (!article?.url) return;
                                    if (navigator.share) {
                                        try {
                                            await navigator.share({ title: article.title, url: window.location.href });
                                            return;
                                        } catch {
                                            // ignore
                                        }
                                    }
                                    await navigator.clipboard.writeText(window.location.href);
                                    window.dispatchEvent(new CustomEvent("show-toast", { detail: { message: "Link copied to clipboard" } }));
                                }}
                                title="Share"
                            >
                                <Share2 className="h-4 w-4" />
                                <span className="hidden sm:inline">Share</span>
                            </button>

                            <button
                                type="button"
                                className="inline-flex items-center gap-2 rounded border border-border bg-card/40 px-2 py-1 text-xs transition-colors"
                                onClick={() => {
                                    if (!article) return;
                                    toggleSaved(article.title);
                                }}
                                title={isSaved ? "Remove from saved" : "Save"}
                            >
                                <Bookmark className={`h-4 w-4 ${isSaved ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                                <span className={`hidden sm:inline ${isSaved ? "text-primary" : "text-muted-foreground"}`}>{isSaved ? "Saved" : "Save"}</span>
                            </button>
                        </div>
                    </div>

                    {query.isLoading ? (
                        <div className="bg-card/30 border border-border rounded p-4 text-sm text-muted-foreground">Loading…</div>
                    ) : query.isError ? (
                        <div className="bg-card/30 border border-border rounded p-4">
                            <div className="text-sm text-foreground">Failed to load article.</div>
                            <div className="mt-2 text-xs text-muted-foreground">Try opening the original source.</div>
                        </div>
                    ) : article ? (
                        <article className="bg-card/30 border border-border rounded p-4 sm:p-6 overflow-hidden">
                            <h1 className="text-lg sm:text-xl font-semibold text-foreground leading-snug">{article.title}</h1>

                            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                <span className="uppercase tracking-wider">{article.source}</span>
                                <span>•</span>
                                <span>{article.category}</span>
                                <span>•</span>
                                <span className="tabular-nums">
                                    {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true }).replace(/^about /, "")}
                                </span>
                                {article.siteName ? (
                                    <>
                                        <span>•</span>
                                        <span>{article.siteName}</span>
                                    </>
                                ) : null}
                            </div>

                            {article.excerpt ? (
                                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{article.excerpt}</p>
                            ) : null}

                            <div className="mt-5 border-t border-border/70 pt-5">
                                {safeHtml ? (
                                    <div
                                        className="prose prose-sm dark:prose-invert max-w-none break-words [&_img]:!max-w-full [&_img]:!h-auto [&_img]:block [&_figure]:max-w-full [&_figure]:m-0"
                                        dangerouslySetInnerHTML={{ __html: safeHtml }}
                                    />
                                ) : article.textContent ? (
                                    <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{article.textContent}</div>
                                ) : (
                                    <div className="text-sm text-muted-foreground">
                                        We couldn’t extract a readable version of this article.
                                        {article.url ? (
                                            <>
                                                {" "}
                                                <a
                                                    href={article.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary underline hover:text-primary/90"
                                                >
                                                    Open the original.
                                                </a>
                                            </>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        </article>
                    ) : null}
                </div>
            </main>
        </div>
    );
};

export default Article;
