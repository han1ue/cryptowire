import type { NewsSummaryResponse } from "@cryptowire/types";
import { AlertTriangle, Lightbulb, PenSquare, Share2, Sparkles } from "lucide-react";
import { ShareMenu } from "@/components/ShareMenu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface AiSummaryPanelProps {
    data?: NewsSummaryResponse;
    isLoading: boolean;
    isError: boolean;
    error?: unknown;
}

const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error && error.message.trim().length > 0) return error.message;
    return "Could not load the summary.";
};

const X_RECAP_BODY_TARGET = 240;

const buildRecapShareText = (data?: NewsSummaryResponse): string => {
    if (!data) return "AI 24h Recap";

    const highlights = data.highlights
        .map((highlight, index) => `${index + 1}. ${highlight.title}: ${highlight.detail}`)
        .join("\n");
    const sourceCoverage = data.sourceCoverage
        .map((source) => `${source.source}: ${source.articleCount} stories`)
        .join(", ");

    const parts = [
        `AI ${data.windowHours}h Recap (${data.articleCount} stories)`,
        `"${data.summary}"`,
        highlights ? `Highlights:\n${highlights}` : "",
        sourceCoverage ? `Source coverage: ${sourceCoverage}` : "",
    ].filter((part) => part.length > 0);

    return parts.join("\n\n");
};

const buildRecapXShareText = (data?: NewsSummaryResponse): string => {
    if (!data) return "AI 24h Recap cryptowi.re/recap";

    const heading = `AI ${data.windowHours}h Recap (${data.articleCount} stories)`;
    const link = "cryptowi.re/recap";
    const truncationSuffix = "(...)";
    const normalizedSummary = data.summary.replace(/"/g, "'").replace(/\s+/g, " ").trim();

    const prefix = `${heading}\n\n"`;
    const suffix = `" ${link}`;
    const maxSummaryLength = Math.max(0, X_RECAP_BODY_TARGET - prefix.length - suffix.length);

    let summaryText = normalizedSummary;
    if (summaryText.length > maxSummaryLength) {
        if (maxSummaryLength <= truncationSuffix.length) {
            summaryText = truncationSuffix.slice(0, maxSummaryLength);
        } else {
            summaryText = `${summaryText.slice(0, maxSummaryLength - truncationSuffix.length).trimEnd()}${truncationSuffix}`;
        }
    }

    return `${prefix}${summaryText}${suffix}`;
};

export const AiSummaryPanel = ({
    data,
    isLoading,
    isError,
    error,
}: AiSummaryPanelProps) => {
    const aiGenerationError = data?.aiError ?? null;
    const modelUsed = data?.model ?? "unknown-model";
    const recapShareUrl =
        typeof window === "undefined" ? "https://cryptowi.re/recap" : `${window.location.origin}/recap`;
    const recapShareText = buildRecapShareText(data);
    const recapXShareText = buildRecapXShareText(data);

    const hasData = Boolean(data);
    const hasArticles = Boolean(data && data.articleCount > 0);

    return (
        <section className="space-y-6 rounded border border-border bg-card/30 p-3 sm:p-4">
            <header className="space-y-2 border-border">
                <div className="flex w-full items-center justify-between gap-3">
                    <h2 className="flex items-center gap-2 text-left text-lg font-semibold leading-none tracking-tight">
                        <Sparkles className="h-4 w-4 text-terminal-cyan" />
                        AI 24h Recap
                    </h2>
                    <ShareMenu
                        url={recapShareUrl}
                        title="AI 24h Recap"
                        text={recapShareText}
                        xText={recapXShareText}
                        xAppendUrl={false}
                        showCopyLink={false}
                    >
                        <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded border border-border bg-card/50 px-3 py-1.5 text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                            title="Share recap"
                            aria-label="Share AI recap"
                        >
                            <Share2 className="h-3.5 w-3.5" />
                            Share
                        </button>
                    </ShareMenu>
                </div>

                {hasData ? (
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-primary/15 text-primary hover:bg-primary/15">
                            {data?.articleCount ?? 0} stories
                        </Badge>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                            Model: {modelUsed}
                        </Badge>
                    </div>
                ) : null}
            </header>

            <div className="space-y-5">
                {isLoading ? (
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-11/12" />
                        <Skeleton className="h-4 w-10/12" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                ) : null}

                {!isLoading && isError ? (
                    <div className="rounded border border-destructive/40 bg-destructive/5 p-4">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-destructive">
                                    AI Recap Unavailable
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {getErrorMessage(error)}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}

                {!isLoading && !isError && hasData && aiGenerationError ? (
                    <div className="rounded border border-destructive/40 bg-destructive/5 p-4">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-destructive">
                                    AI Generation Failed
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {aiGenerationError}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}

                {!isLoading && !isError && hasData && !hasArticles ? (
                    <div className="rounded border border-border bg-card/40 p-4">
                        <p className="text-sm text-foreground">
                            No stories were available across tracked sources in the last {data.windowHours} hours.
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Wait for the next refresh cycle.
                        </p>
                    </div>
                ) : null}

                {!isLoading && !isError && hasData && hasArticles && !aiGenerationError ? (
                    <>
                        <section className="rounded border border-border bg-card/40 p-4">
                            <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                                <PenSquare className="h-3.5 w-3.5 text-primary" />
                                Summary
                            </div>
                            <p className="text-sm leading-relaxed text-foreground">{data.summary}</p>
                        </section>

                        <section className="space-y-2">
                            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                                <Lightbulb className="h-3.5 w-3.5 text-primary" />
                                Highlights
                            </div>
                            <div className="space-y-2">
                                {data.highlights.map((highlight, index) => (
                                    <article key={`${highlight.title}-${index}`} className="rounded border border-border bg-card/40 p-3">
                                        {(() => {
                                            const signalUrl =
                                                highlight.url ??
                                                `https://www.google.com/search?q=${encodeURIComponent(`${highlight.title} crypto`)}`;
                                            return (
                                                <>
                                                    <div className="flex items-start justify-between gap-3">
                                                        <a
                                                            href={signalUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                                                        >
                                                            {highlight.title}
                                                        </a>
                                                        <span className="text-[10px] text-muted-foreground">#{index + 1}</span>
                                                    </div>
                                                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                                        {highlight.detail}
                                                    </p>
                                                    <a
                                                        href={signalUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-2 inline-block text-[10px] uppercase tracking-wider text-primary hover:underline"
                                                    >
                                                        {highlight.url ? "Open article" : "Search article"}
                                                    </a>
                                                </>
                                            );
                                        })()}
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {highlight.sources.map((source) => (
                                                <span
                                                    key={`${highlight.title}-${source}`}
                                                    className="inline-flex items-center rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground"
                                                >
                                                    {source}
                                                </span>
                                            ))}
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>

                        <section>
                            <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                                Sources Reputation
                            </div>
                            <div className="space-y-1.5">
                                {data.sourceCoverage.map((source) => {
                                    const width = `${Math.round(source.reputationWeight * 100)}%`;
                                    return (
                                        <div
                                            key={`${source.sourceId}-${source.source}`}
                                            className="rounded border border-border bg-card/40 px-3 py-2"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs text-foreground">{source.source}</span>
                                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                                    {source.articleCount} stories
                                                </span>
                                            </div>
                                            <div className="mt-1 h-1.5 w-full rounded bg-muted/60">
                                                <div
                                                    className="h-1.5 rounded bg-gradient-to-r from-primary/70 to-terminal-cyan/80"
                                                    style={{ width }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </>
                ) : null}
            </div>
        </section>
    );
};
