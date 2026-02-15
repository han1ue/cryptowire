import { z } from "zod";
import {
    NewsSummaryResponseSchema,
    type NewsItem,
    type NewsSummaryHighlight,
    type NewsSummaryResponse,
    type NewsSummarySourceCoverage,
} from "@cryptowire/types";
import { SUPPORTED_NEWS_SOURCES, type NewsSourceId } from "@cryptowire/types/sources";

type NewsSummaryServiceOptions = {
    geminiApiKey?: string;
    geminiModel?: string;
    openAiApiKey?: string;
    openAiModel?: string;
    requestTimeoutMs?: number;
};

type RankedNewsItem = {
    item: NewsItem;
    sourceId: NewsSourceId | null;
    sourceName: string;
    reputationWeight: number;
    score: number;
};

type AiSummarySuccess = {
    ok: true;
    summary: string;
    highlights: NewsSummaryHighlight[];
    model: string;
};

type AiSummaryFailure = {
    ok: false;
    model: string;
    aiError: string;
};

const SOURCE_REPUTATION_WEIGHTS: Record<NewsSourceId, number> = {
    coindesk: 0.95,
    decrypt: 0.89,
    cointelegraph: 0.88,
    blockworks: 0.91,
    "bitcoin.com": 0.72,
    cryptopotato: 0.68,
    forbes: 0.73,
    cryptopolitan: 0.66,
    coinpaprika: 0.64,
    seekingalpha: 0.55,
    bitcoinist: 0.6,
    newsbtc: 0.58,
    utoday: 0.68,
    investing_comcryptonews: 0.48,
    ethereumfoundation: 0.88,
    bitcoincore: 0.88,
};

const DEFAULT_REPUTATION_WEIGHT = 0.55;
const MAX_HIGHLIGHTS = 8;
const MAX_ARTICLES_IN_PROMPT = 140;
const DEFAULT_AI_REQUEST_TIMEOUT_MS = 40_000;
const SOURCE_ID_SET = new Set<string>(SUPPORTED_NEWS_SOURCES.map((source) => source.id));

const sourceNameById = new Map<NewsSourceId, string>();
const sourceIdByKey = new Map<string, NewsSourceId>();

for (const source of SUPPORTED_NEWS_SOURCES) {
    sourceNameById.set(source.id, source.name);
    sourceIdByKey.set(source.id.trim().toLowerCase(), source.id);
    sourceIdByKey.set(source.name.trim().toLowerCase(), source.id);
}

const AiSummaryOutputSchema = z.object({
    summary: z.string().min(1),
    highlights: z
        .array(
            z.object({
                title: z.string().min(1),
                detail: z.string().min(1),
                sources: z.array(z.string().min(1)).min(1),
                url: z.string().url().optional(),
            }),
        )
        .min(1)
        .max(MAX_HIGHLIGHTS),
});

const sanitizeText = (value: string | undefined, maxChars: number): string => {
    const compact = (value ?? "").replace(/\s+/g, " ").trim();
    if (compact.length <= maxChars) return compact;
    return compact.slice(0, Math.max(0, maxChars - 3)).trimEnd() + "...";
};

const isKnownSourceId = (value: string): value is NewsSourceId => SOURCE_ID_SET.has(value);

const resolveSourceId = (raw: string): NewsSourceId | null => {
    const normalized = raw.trim().toLowerCase();
    if (!normalized) return null;
    return sourceIdByKey.get(normalized) ?? null;
};

const getSourceNameFromId = (sourceId: NewsSourceId): string => {
    return sourceNameById.get(sourceId) ?? sourceId;
};

const getSourceWeightById = (sourceId: NewsSourceId | null): number => {
    if (!sourceId) return DEFAULT_REPUTATION_WEIGHT;
    return SOURCE_REPUTATION_WEIGHTS[sourceId] ?? DEFAULT_REPUTATION_WEIGHT;
};

const uniqueStrings = (values: string[]): string[] => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const value of values) {
        const trimmed = value.trim();
        if (!trimmed) continue;
        const key = trimmed.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(trimmed);
    }
    return out;
};

const normalizeComparableText = (value: string): string => {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
};

const toErrorModel = (label: string, detail?: string): string => {
    const base = `error-${label}`;
    if (!detail || !detail.trim()) return base;
    const normalized = detail
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    if (!normalized) return base;
    return `${base}:${normalized.slice(0, 48)}`;
};

const extractMessageText = (raw: unknown): string | null => {
    const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
    if (!record) return null;

    const choicesRaw = record.choices;
    if (!Array.isArray(choicesRaw) || choicesRaw.length === 0) return null;

    const first = choicesRaw[0];
    const firstRecord = first && typeof first === "object" ? (first as Record<string, unknown>) : null;
    const message = firstRecord?.message;
    const messageRecord = message && typeof message === "object" ? (message as Record<string, unknown>) : null;
    const content = messageRecord?.content;

    if (typeof content === "string") return content;

    if (Array.isArray(content)) {
        const text = content
            .map((part) => {
                if (!part || typeof part !== "object") return "";
                const partRecord = part as Record<string, unknown>;
                if (typeof partRecord.text === "string") return partRecord.text;
                return "";
            })
            .join("")
            .trim();
        return text || null;
    }

    return null;
};

const extractGeminiText = (raw: unknown): string | null => {
    const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
    if (!record) return null;

    const candidatesRaw = record.candidates;
    if (!Array.isArray(candidatesRaw) || candidatesRaw.length === 0) return null;
    const firstCandidate = candidatesRaw[0];
    const candidateRecord =
        firstCandidate && typeof firstCandidate === "object" ? (firstCandidate as Record<string, unknown>) : null;
    if (!candidateRecord) return null;

    const content = candidateRecord.content;
    const contentRecord = content && typeof content === "object" ? (content as Record<string, unknown>) : null;
    const partsRaw = contentRecord?.parts;
    if (!Array.isArray(partsRaw) || partsRaw.length === 0) return null;

    const text = partsRaw
        .map((part) => {
            const partRecord = part && typeof part === "object" ? (part as Record<string, unknown>) : null;
            return typeof partRecord?.text === "string" ? partRecord.text : "";
        })
        .join("")
        .trim();

    return text || null;
};

export class NewsSummaryService {
    private readonly geminiApiKey: string | null;
    private readonly geminiModel: string;
    private readonly openAiApiKey: string | null;
    private readonly openAiModel: string;
    private readonly aiRequestTimeoutMs: number;

    constructor(options?: NewsSummaryServiceOptions) {
        this.geminiApiKey = options?.geminiApiKey?.trim() ? options.geminiApiKey.trim() : null;
        this.geminiModel = options?.geminiModel?.trim() || "gemini-2.0-flash";
        this.openAiApiKey = options?.openAiApiKey?.trim() ? options.openAiApiKey.trim() : null;
        this.openAiModel = options?.openAiModel?.trim() || "gpt-4.1-mini";
        const requestedTimeoutMs = options?.requestTimeoutMs;
        this.aiRequestTimeoutMs = typeof requestedTimeoutMs === "number" && Number.isFinite(requestedTimeoutMs)
            ? Math.max(5_000, Math.min(55_000, Math.trunc(requestedTimeoutMs)))
            : DEFAULT_AI_REQUEST_TIMEOUT_MS;
    }

    private getPreferredModelLabel(): string {
        if (this.geminiApiKey) return this.geminiModel;
        if (this.openAiApiKey) return this.openAiModel;
        return this.geminiModel || this.openAiModel || "unknown-model";
    }

    async summarize(params: {
        items: NewsItem[];
        sourceIds: string[];
        windowHours: number;
        windowStart: string;
        windowEnd: string;
    }): Promise<NewsSummaryResponse> {
        const sourceIds = this.normalizeRequestedSourceIds(params.sourceIds);
        const ranked = this.rankItems(params.items, params.windowEnd, params.windowHours);
        const sourceCoverage = this.buildSourceCoverage(ranked, sourceIds);

        if (ranked.length === 0) {
            const payload: NewsSummaryResponse = {
                generatedAt: new Date().toISOString(),
                windowStart: params.windowStart,
                windowEnd: params.windowEnd,
                windowHours: params.windowHours,
                articleCount: 0,
                model: this.getPreferredModelLabel(),
                aiError: null,
                summary: `No matching articles were found in the last ${params.windowHours} hours.`,
                highlights: [],
                sourceCoverage,
            };
            const validated = NewsSummaryResponseSchema.safeParse(payload);
            if (!validated.success) {
                throw new Error("Invalid empty summary shape");
            }
            return validated.data;
        }

        const aiResult = await this.generateWithAi({
            ranked,
            sourceCoverage,
            windowHours: params.windowHours,
            windowStart: params.windowStart,
            windowEnd: params.windowEnd,
        });

        const aiPayload = aiResult && aiResult.ok ? aiResult : null;
        const aiFailureModel = aiResult && !aiResult.ok ? aiResult.model : null;
        const aiFailureError = aiResult && !aiResult.ok ? aiResult.aiError : null;

        const finalHighlights = aiPayload
            ? this.normalizeHighlights(aiPayload.highlights, ranked)
            : [];

        const payload: NewsSummaryResponse = {
            generatedAt: new Date().toISOString(),
            windowStart: params.windowStart,
            windowEnd: params.windowEnd,
            windowHours: params.windowHours,
            articleCount: ranked.length,
            model: aiPayload?.model ?? aiFailureModel ?? this.getPreferredModelLabel(),
            aiError: aiPayload ? null : aiFailureError ?? toErrorModel("getting-model"),
            summary: aiPayload?.summary ?? "AI brief unavailable for this refresh. Please try again later.",
            highlights: finalHighlights,
            sourceCoverage,
        };

        const validated = NewsSummaryResponseSchema.safeParse(payload);
        if (!validated.success) {
            throw new Error("Invalid summary response shape");
        }
        return validated.data;
    }

    private normalizeRequestedSourceIds(rawSourceIds: string[]): NewsSourceId[] {
        const requested = rawSourceIds
            .map((sourceId) => sourceId.trim().toLowerCase())
            .filter(Boolean)
            .filter(isKnownSourceId);

        if (requested.length > 0) {
            return Array.from(new Set(requested));
        }

        return SUPPORTED_NEWS_SOURCES.map((source) => source.id);
    }

    private rankItems(items: NewsItem[], windowEndIso: string, windowHours: number): RankedNewsItem[] {
        const windowEndMs = Date.parse(windowEndIso);
        const effectiveWindowHours = Math.max(1, windowHours);
        const effectiveWindowMs = effectiveWindowHours * 60 * 60 * 1000;
        const safeWindowEndMs = Number.isFinite(windowEndMs) ? windowEndMs : Date.now();

        const ranked = items.map((item) => {
            const sourceNameRaw = item.source?.trim() ? item.source.trim() : "Unknown";
            const sourceId = resolveSourceId(sourceNameRaw);
            const sourceName = sourceId ? getSourceNameFromId(sourceId) : sourceNameRaw;
            const reputationWeight = getSourceWeightById(sourceId);

            const publishedMs = Date.parse(item.publishedAt);
            const safePublishedMs = Number.isFinite(publishedMs) ? publishedMs : safeWindowEndMs;
            const ageMs = Math.max(0, safeWindowEndMs - safePublishedMs);
            const recencyWeight = Math.max(0, 1 - ageMs / effectiveWindowMs);

            // Reputation dominates, but recency still matters for a rolling 24h brief.
            const score = reputationWeight * 0.7 + recencyWeight * 0.3;

            return {
                item,
                sourceId,
                sourceName,
                reputationWeight,
                score,
            } satisfies RankedNewsItem;
        });

        ranked.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (b.item.publishedAt !== a.item.publishedAt) {
                return b.item.publishedAt > a.item.publishedAt ? 1 : -1;
            }
            return a.item.title.localeCompare(b.item.title);
        });

        return ranked;
    }

    private buildSourceCoverage(ranked: RankedNewsItem[], sourceIds: NewsSourceId[]): NewsSummarySourceCoverage[] {
        const byKey = new Map<string, NewsSummarySourceCoverage>();

        for (const sourceId of sourceIds) {
            byKey.set(sourceId, {
                sourceId,
                source: getSourceNameFromId(sourceId),
                articleCount: 0,
                reputationWeight: getSourceWeightById(sourceId),
            });
        }

        for (const entry of ranked) {
            const sourceId = entry.sourceId;
            if (sourceId && byKey.has(sourceId)) {
                const row = byKey.get(sourceId);
                if (row) row.articleCount += 1;
                continue;
            }

            const unknownKey = `unknown:${entry.sourceName.trim().toLowerCase()}`;
            const existing = byKey.get(unknownKey);
            if (existing) {
                existing.articleCount += 1;
                continue;
            }

            byKey.set(unknownKey, {
                sourceId: entry.sourceName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "unknown",
                source: entry.sourceName,
                articleCount: 1,
                reputationWeight: DEFAULT_REPUTATION_WEIGHT,
            });
        }

        const list = Array.from(byKey.values());
        list.sort((a, b) => {
            if (b.articleCount !== a.articleCount) return b.articleCount - a.articleCount;
            if (b.reputationWeight !== a.reputationWeight) return b.reputationWeight - a.reputationWeight;
            return a.source.localeCompare(b.source);
        });
        return list;
    }

    private findBestUrlForHighlight(
        title: string,
        sources: string[],
        ranked: RankedNewsItem[],
    ): string | undefined {
        const titleNorm = normalizeComparableText(title);
        if (!titleNorm) return undefined;

        const sourceKeys = new Set(sources.map((source) => source.trim().toLowerCase()).filter(Boolean));

        let best: { score: number; url: string } | null = null;

        for (const entry of ranked) {
            const url = entry.item.url;
            if (!url) continue;

            const entryTitleNorm = normalizeComparableText(entry.item.title);
            if (!entryTitleNorm) continue;

            let score = 0;
            const sourceMatch = sourceKeys.has(entry.sourceName.trim().toLowerCase());
            if (sourceMatch) score += 3;

            if (entryTitleNorm === titleNorm) score += 8;
            if (entryTitleNorm.includes(titleNorm) || titleNorm.includes(entryTitleNorm)) score += 5;

            const titleTokens = new Set(titleNorm.split(" ").filter((token) => token.length > 2));
            const entryTokens = new Set(entryTitleNorm.split(" ").filter((token) => token.length > 2));
            let tokenOverlap = 0;
            for (const token of titleTokens) {
                if (entryTokens.has(token)) tokenOverlap++;
            }
            score += Math.min(4, tokenOverlap);

            if (!best || score > best.score) {
                best = { score, url };
            }
        }

        return best && best.score > 0 ? best.url : undefined;
    }

    private normalizeHighlights(
        highlights: NewsSummaryHighlight[],
        ranked: RankedNewsItem[],
    ): NewsSummaryHighlight[] {
        const out: NewsSummaryHighlight[] = highlights
            .map((highlight) => ({
                title: sanitizeText(highlight.title, 120),
                detail: sanitizeText(highlight.detail, 320),
                sources: uniqueStrings(
                    highlight.sources.map((source) => {
                        const sourceId = resolveSourceId(source);
                        if (sourceId) return getSourceNameFromId(sourceId);
                        return source.trim();
                    }),
                ),
                url: highlight.url,
            }))
            .filter((highlight) => highlight.title.length > 0 && highlight.detail.length > 0 && highlight.sources.length > 0)
            .map((highlight) => ({
                ...highlight,
                url: highlight.url ?? this.findBestUrlForHighlight(highlight.title, highlight.sources, ranked),
            }))
            .slice(0, MAX_HIGHLIGHTS);

        return out.slice(0, MAX_HIGHLIGHTS);
    }

    private async generateWithAi(params: {
        ranked: RankedNewsItem[];
        sourceCoverage: NewsSummarySourceCoverage[];
        windowHours: number;
        windowStart: string;
        windowEnd: string;
    }): Promise<AiSummarySuccess | AiSummaryFailure> {
        if (params.ranked.length === 0) {
            return {
                ok: false,
                model: this.getPreferredModelLabel(),
                aiError: toErrorModel("no-articles"),
            };
        }
        if (!this.geminiApiKey && !this.openAiApiKey) {
            return {
                ok: false,
                model: this.getPreferredModelLabel(),
                aiError: toErrorModel("no-ai-key"),
            };
        }

        const topRows = params.ranked.slice(0, MAX_ARTICLES_IN_PROMPT);
        const sourceCoverageRows = params.sourceCoverage
            .map((source) => `${source.source} | id=${source.sourceId} | weight=${source.reputationWeight} | articles=${source.articleCount}`)
            .join("\n");

        const articleRows = topRows
            .map((entry, index) => {
                const categories = Array.isArray(entry.item.categories) && entry.item.categories.length > 0
                    ? entry.item.categories.join("/")
                    : "News";
                const title = sanitizeText(entry.item.title, 180);
                const summary = sanitizeText(entry.item.summary, 260);
                const source = entry.sourceName;
                const url = entry.item.url ?? "n/a";
                return `${index + 1}. source=${source}; weight=${entry.reputationWeight.toFixed(2)}; publishedAt=${entry.item.publishedAt}; categories=${categories}; title=${title}; summary=${summary}; url=${url}`;
            })
            .join("\n");

        const systemPrompt =
            "You are an analyst writing a concise crypto dashboard brief. " +
            "Use only the provided dataset. " +
            "Prioritize high-reputation sources when evidence conflicts, but still include breadth from all active sources.";

        const userPrompt =
            `Return strict JSON with keys: summary (string), highlights (array). ` +
            `Interpret highlights as key articles. ` +
            `Each key article item must be: { "title": string, "detail": string, "sources": string[], "url"?: string }. ` +
            `Window: last ${params.windowHours} hours (${params.windowStart} to ${params.windowEnd}). ` +
            `Keep summary to 3-5 sentences, and generate 4-8 highlights focused on the most important developments.\n\n` +
            `Source coverage:\n${sourceCoverageRows}\n\n` +
            `Articles:\n${articleRows}`;

        const parseAiOutput = (text: string): { summary: string; highlights: NewsSummaryHighlight[] } | null => {
            let parsedJson: unknown;
            try {
                parsedJson = JSON.parse(text);
            } catch {
                return null;
            }

            const parsed = AiSummaryOutputSchema.safeParse(parsedJson);
            if (!parsed.success) return null;

            return {
                summary: sanitizeText(parsed.data.summary, 1200),
                highlights: parsed.data.highlights.map((highlight) => ({
                    title: sanitizeText(highlight.title, 120),
                    detail: sanitizeText(highlight.detail, 320),
                    sources: uniqueStrings(highlight.sources.map((source) => source.trim()).filter(Boolean)),
                    url: highlight.url,
                })),
            };
        };

        const requestGemini = async (model: string): Promise<
            { ok: true; text: string; model: string } | { ok: false; model: string; errorModel: string }
        > => {
            if (!this.geminiApiKey) return { ok: false, model, errorModel: toErrorModel("gemini-no-key") };

            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), this.aiRequestTimeoutMs);
                const endpoint =
                    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent` +
                    `?key=${encodeURIComponent(this.geminiApiKey)}`;

                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        contents: [
                            {
                                role: "user",
                                parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
                            },
                        ],
                        generationConfig: {
                            temperature: 0.2,
                            responseMimeType: "application/json",
                        },
                    }),
                    signal: controller.signal,
                });
                clearTimeout(timeout);

                if (!response.ok) {
                    let detail = "";
                    try {
                        const raw = (await response.json()) as Record<string, unknown>;
                        const errorBlock =
                            raw.error && typeof raw.error === "object" ? (raw.error as Record<string, unknown>) : null;
                        if (typeof errorBlock?.message === "string") detail = errorBlock.message;
                    } catch {
                        // ignore parsing errors
                    }
                    return {
                        ok: false,
                        model,
                        errorModel: toErrorModel(`gemini-http-${response.status}`, detail),
                    };
                }

                const raw = (await response.json()) as unknown;
                const text = extractGeminiText(raw);
                if (!text) return { ok: false, model, errorModel: toErrorModel("gemini-empty-response", model) };

                return {
                    ok: true,
                    text,
                    model,
                };
            } catch (error) {
                if (error instanceof Error && error.name === "AbortError") {
                    return { ok: false, model, errorModel: toErrorModel("gemini-timeout", model) };
                }
                return { ok: false, model, errorModel: toErrorModel("gemini-request-failed", model) };
            }
        };

        const requestOpenAi = async (): Promise<
            { ok: true; text: string; model: string } | { ok: false; model: string; errorModel: string }
        > => {
            if (!this.openAiApiKey) return { ok: false, model: this.openAiModel, errorModel: toErrorModel("openai-no-key") };

            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), this.aiRequestTimeoutMs);
                const response = await fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${this.openAiApiKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model: this.openAiModel,
                        temperature: 0.2,
                        response_format: { type: "json_object" },
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: userPrompt },
                        ],
                    }),
                    signal: controller.signal,
                });
                clearTimeout(timeout);

                if (!response.ok) {
                    let detail = "";
                    try {
                        const raw = (await response.json()) as Record<string, unknown>;
                        const errorBlock =
                            raw.error && typeof raw.error === "object" ? (raw.error as Record<string, unknown>) : null;
                        if (typeof errorBlock?.message === "string") detail = errorBlock.message;
                    } catch {
                        // ignore parsing errors
                    }
                    return {
                        ok: false,
                        model: this.openAiModel,
                        errorModel: toErrorModel(`openai-http-${response.status}`, detail),
                    };
                }

                const raw = (await response.json()) as unknown;
                const text = extractMessageText(raw);
                if (!text) return { ok: false, model: this.openAiModel, errorModel: toErrorModel("openai-empty-response", this.openAiModel) };

                const modelRaw =
                    raw && typeof raw === "object" && typeof (raw as Record<string, unknown>).model === "string"
                        ? ((raw as Record<string, unknown>).model as string)
                        : null;

                return {
                    ok: true,
                    text,
                    model: modelRaw ?? this.openAiModel,
                };
            } catch (error) {
                if (error instanceof Error && error.name === "AbortError") {
                    return { ok: false, model: this.openAiModel, errorModel: toErrorModel("openai-timeout", this.openAiModel) };
                }
                return { ok: false, model: this.openAiModel, errorModel: toErrorModel("openai-request-failed", this.openAiModel) };
            }
        };

        const failures: Array<{ model: string; error: string }> = [];

        if (this.geminiApiKey) {
            const geminiModels = uniqueStrings([this.geminiModel, "gemini-2.0-flash"]);
            for (const model of geminiModels) {
                const geminiResult = await requestGemini(model);
                if (geminiResult.ok) {
                    const parsed = parseAiOutput(geminiResult.text);
                    if (parsed) return { ok: true, ...parsed, model: geminiResult.model };
                    failures.push({ model, error: toErrorModel("gemini-invalid-json", model) });
                    continue;
                }
                failures.push({ model: geminiResult.model, error: geminiResult.errorModel });
            }
        }

        if (this.openAiApiKey) {
            const openAiResult = await requestOpenAi();
            if (openAiResult.ok) {
                const parsed = parseAiOutput(openAiResult.text);
                if (parsed) return { ok: true, ...parsed, model: openAiResult.model };
                failures.push({ model: this.openAiModel, error: toErrorModel("openai-invalid-json", this.openAiModel) });
            } else {
                failures.push({ model: openAiResult.model, error: openAiResult.errorModel });
            }
        }

        const firstFailure = failures[0];
        return {
            ok: false,
            model: firstFailure?.model ?? this.getPreferredModelLabel(),
            aiError: firstFailure?.error ?? toErrorModel("getting-model"),
        };
    }
}
