import type { NewsSummaryResponse } from "@cryptowire/types";
import { formatDistanceToNowStrict } from "date-fns";
import { AlertTriangle, BrainCircuit, RotateCw, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface AiSummaryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data?: NewsSummaryResponse;
    isLoading: boolean;
    isFetching: boolean;
    isError: boolean;
    error?: unknown;
    onRefresh: () => void;
}

const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error && error.message.trim().length > 0) return error.message;
    return "Could not load the AI brief.";
};

export const AiSummaryDialog = ({
    open,
    onOpenChange,
    data,
    isLoading,
    isFetching,
    isError,
    error,
    onRefresh,
}: AiSummaryDialogProps) => {
    const formatDailyRefreshLocalTime = (referenceDate: Date): string => {
        const scheduledUtc = new Date(
            Date.UTC(
                referenceDate.getUTCFullYear(),
                referenceDate.getUTCMonth(),
                referenceDate.getUTCDate(),
                0,
                0,
                0,
            ),
        );

        return new Intl.DateTimeFormat(undefined, {
            hour: "numeric",
            minute: "2-digit",
            timeZoneName: "short",
        }).format(scheduledUtc);
    };

    const dailyRefreshTimeLabel = formatDailyRefreshLocalTime(
        data?.generatedAt ? new Date(data.generatedAt) : new Date(),
    );
    const generatedAtLabel = data?.generatedAt
        ? formatDistanceToNowStrict(new Date(data.generatedAt), { addSuffix: true })
        : null;
    const aiGenerationError = data?.aiError ?? null;
    const modelUsed = data?.model ?? "unknown-model";

    const hasData = Boolean(data);
    const hasArticles = Boolean(data && data.articleCount > 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl overflow-hidden p-8 pt-12">
                <DialogHeader className="border-b border-border px-0 pb-4 pt-0">
                    <div className="flex w-full items-center justify-between gap-3">
                        <div>
                            <DialogTitle className="flex items-center gap-2 text-left">
                                <Sparkles className="h-4 w-4 text-terminal-cyan" />
                                AI 24h Brief
                            </DialogTitle>
                        </div>

                        <button
                            type="button"
                            onClick={onRefresh}
                            disabled={isFetching}
                            className="inline-flex items-center gap-1 rounded border border-border bg-muted/40 px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <RotateCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
                            Refresh
                        </button>
                    </div>

                    {hasData ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Badge className="bg-primary/15 text-primary hover:bg-primary/15">
                                {data?.articleCount ?? 0} stories
                            </Badge>
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                                Model: {modelUsed}
                            </Badge>
                            {generatedAtLabel ? (
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                    Updated every day at {dailyRefreshTimeLabel} ({generatedAtLabel})
                                </span>
                            ) : null}
                        </div>
                    ) : null}
                </DialogHeader>

                <div className="max-h-[72vh] space-y-5 overflow-y-auto px-0 pb-0 pt-4">
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
                                        AI Brief Unavailable
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
                                    <BrainCircuit className="h-3.5 w-3.5 text-primary" />
                                    Summary
                                </div>
                                <p className="text-sm leading-relaxed text-foreground">{data.summary}</p>
                            </section>

                            <section className="space-y-2">
                                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                                    Key Signals
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
                                                            {highlight.url ? "Open source article" : "Search signal"}
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

                            {data.notes.length > 0 ? (
                                <section className="rounded border border-border bg-card/40 p-4">
                                    <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                                        Notes
                                    </div>
                                    <ul className="space-y-1 text-xs text-muted-foreground">
                                        {data.notes.map((note, index) => (
                                            <li key={`${note}-${index}`}>- {note}</li>
                                        ))}
                                    </ul>
                                </section>
                            ) : null}
                        </>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
};
