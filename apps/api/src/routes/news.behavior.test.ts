import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import type { NewsItem, NewsSummaryResponse } from "@cryptowire/types";
import { createNewsRouter } from "./news.js";

const runningServers = new Set<Server>();
const refreshSecret = "test-refresh-secret";
const originalFetch = globalThis.fetch;

const startServer = async (server: Server) => {
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    runningServers.add(server);
    const address = server.address();
    assert(address && typeof address === "object");
    return `http://127.0.0.1:${(address as AddressInfo).port}`;
};

const stopServer = async (server: Server) => {
    await new Promise<void>((resolve, reject) => {
        server.close((err) => {
            if (err) return reject(err);
            resolve();
        });
    });
};

const parseJson = (raw: string): unknown => {
    try {
        return JSON.parse(raw) as unknown;
    } catch {
        return null;
    }
};

const request = async (baseUrl: string, path: string, init?: RequestInit) => {
    const response = await fetch(baseUrl + path, init);
    const text = await response.text();
    return {
        status: response.status,
        text,
        json: parseJson(text),
    };
};

const makeStore = (seedItems: NewsItem[]) => {
    let items = [...seedItems];
    return {
        async putMany(nextItems: NewsItem[]) {
            items = [...nextItems];
        },
        async getPage(params: { limit: number; offset: number; afterId?: string }) {
            const afterId = typeof params.afterId === "string" ? params.afterId.trim() : "";
            if (!afterId) {
                return items.slice(params.offset, params.offset + params.limit);
            }
            const anchorIndex = items.findIndex((item) => item.id === afterId);
            if (anchorIndex < 0) return [];
            const start = anchorIndex + 1 + params.offset;
            return items.slice(start, start + params.limit);
        },
        async getById(id: string) {
            return items.find((item) => item.id === id) ?? null;
        },
        async count() {
            return items.length;
        },
        async pruneOlderThan(isoCutoff: string) {
            items = items.filter((item) => item.publishedAt >= isoCutoff);
        },
    };
};

after(async () => {
    for (const server of runningServers) {
        await stopServer(server);
    }
    runningServers.clear();
    globalThis.fetch = originalFetch;
});

test("GET /news returns empty list when all requested sources are invalid", async () => {
    process.env.NODE_ENV = "production";

    const nowIso = new Date().toISOString();
    const newsStore = makeStore([
        {
            id: "1",
            title: "CoinDesk story",
            summary: "Summary",
            source: "CoinDesk",
            categories: ["News"],
            publishedAt: nowIso,
            url: "https://www.coindesk.com/example",
        },
    ]);

    const newsSummaryStore = {
        async getLatest() {
            return null;
        },
        async putLatest(_summary: NewsSummaryResponse) {
            // no-op
        },
    };

    const newsSummaryService = {
        async summarize() {
            throw new Error("not used in this test");
        },
    };

    const newsService = {
        async refreshHeadlines() {
            return [];
        },
    };

    const app = express();
    app.use(express.json());
    app.use(createNewsRouter(
        newsService as never,
        newsStore as never,
        newsSummaryService as never,
        newsSummaryStore as never,
        { refreshSecret, siteUrl: "https://cryptowi.re" },
    ));

    const server = createServer(app);
    const baseUrl = await startServer(server);
    const res = await request(baseUrl, "/news?sources=not-a-real-source");

    assert.equal(res.status, 200);
    assert.deepEqual(res.json, { items: [] });
});

test("POST /news/summary/refresh skip cache keys include sources and limit", async () => {
    process.env.NODE_ENV = "production";

    const nowIso = new Date().toISOString();
    const newsStore = makeStore([
        {
            id: "1",
            title: "CoinDesk story",
            summary: "Summary",
            source: "CoinDesk",
            categories: ["News"],
            publishedAt: nowIso,
            url: "https://www.coindesk.com/example",
        },
        {
            id: "2",
            title: "Decrypt story",
            summary: "Summary",
            source: "Decrypt",
            categories: ["News"],
            publishedAt: nowIso,
            url: "https://decrypt.co/example",
        },
    ]);

    let latestSummary: NewsSummaryResponse | null = null;
    const newsSummaryStore = {
        async getLatest() {
            return latestSummary;
        },
        async putLatest(summary: NewsSummaryResponse) {
            latestSummary = summary;
        },
    };

    let summarizeCalls = 0;
    const newsSummaryService = {
        async summarize(params: {
            items: NewsItem[];
            sourceIds: string[];
            windowHours: number;
            windowStart: string;
            windowEnd: string;
        }): Promise<NewsSummaryResponse> {
            summarizeCalls++;
            return {
                generatedAt: new Date().toISOString(),
                windowStart: params.windowStart,
                windowEnd: params.windowEnd,
                windowHours: params.windowHours,
                articleCount: params.items.length,
                model: "test-model",
                aiError: null,
                summary: `Summary run ${summarizeCalls}`,
                highlights: [],
                sourceCoverage: params.sourceIds.map((sourceId) => ({
                    sourceId,
                    source: sourceId,
                    articleCount: 0,
                    reputationWeight: 0.5,
                })),
            };
        },
    };

    const newsService = {
        async refreshHeadlines() {
            return [];
        },
    };

    const app = express();
    app.use(express.json());
    app.use(createNewsRouter(
        newsService as never,
        newsStore as never,
        newsSummaryService as never,
        newsSummaryStore as never,
        { refreshSecret, siteUrl: "https://cryptowi.re" },
    ));

    const server = createServer(app);
    const baseUrl = await startServer(server);

    const callRefresh = async (body: Record<string, unknown>) =>
        request(baseUrl, "/news/summary/refresh", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-refresh-secret": refreshSecret,
            },
            body: JSON.stringify(body),
        });

    const first = await callRefresh({ hours: 24, limit: 50, sources: "coindesk" });
    assert.equal(first.status, 200);
    assert.equal((first.json as Record<string, unknown>)?.skipped, false);
    assert.equal(summarizeCalls, 1);

    const second = await callRefresh({ hours: 24, limit: 50, sources: "coindesk" });
    assert.equal(second.status, 200);
    assert.equal((second.json as Record<string, unknown>)?.skipped, true);
    assert.equal(summarizeCalls, 1);

    const third = await callRefresh({ hours: 24, limit: 50, sources: "decrypt" });
    assert.equal(third.status, 200);
    assert.equal((third.json as Record<string, unknown>)?.skipped, false);
    assert.equal(summarizeCalls, 2);

    const fourth = await callRefresh({ hours: 24, limit: 60, sources: "decrypt" });
    assert.equal(fourth.status, 200);
    assert.equal((fourth.json as Record<string, unknown>)?.skipped, false);
    assert.equal(summarizeCalls, 3);
});

test("GET /news supports cursor pagination via last item id", async () => {
    process.env.NODE_ENV = "production";

    const now = Date.now();
    const newsStore = makeStore([
        {
            id: "a1",
            title: "Item 1",
            summary: "Summary 1",
            source: "CoinDesk",
            categories: ["News"],
            publishedAt: new Date(now).toISOString(),
            url: "https://www.coindesk.com/item-1",
        },
        {
            id: "a2",
            title: "Item 2",
            summary: "Summary 2",
            source: "CoinDesk",
            categories: ["News"],
            publishedAt: new Date(now - 1_000).toISOString(),
            url: "https://www.coindesk.com/item-2",
        },
        {
            id: "a3",
            title: "Item 3",
            summary: "Summary 3",
            source: "CoinDesk",
            categories: ["News"],
            publishedAt: new Date(now - 2_000).toISOString(),
            url: "https://www.coindesk.com/item-3",
        },
        {
            id: "a4",
            title: "Item 4",
            summary: "Summary 4",
            source: "CoinDesk",
            categories: ["News"],
            publishedAt: new Date(now - 3_000).toISOString(),
            url: "https://www.coindesk.com/item-4",
        },
    ]);

    const newsSummaryStore = {
        async getLatest() {
            return null;
        },
        async putLatest(_summary: NewsSummaryResponse) {
            // no-op
        },
    };

    const newsSummaryService = {
        async summarize() {
            throw new Error("not used in this test");
        },
    };

    const newsService = {
        async refreshHeadlines() {
            return [];
        },
    };

    const app = express();
    app.use(express.json());
    app.use(createNewsRouter(
        newsService as never,
        newsStore as never,
        newsSummaryService as never,
        newsSummaryStore as never,
        { refreshSecret, siteUrl: "https://cryptowi.re" },
    ));

    const server = createServer(app);
    const baseUrl = await startServer(server);

    const first = await request(baseUrl, "/news?sources=coindesk&limit=2");
    assert.equal(first.status, 200);
    const firstPayload = first.json as { items: NewsItem[] };
    assert.equal(firstPayload.items.length, 2);
    const firstIds = firstPayload.items.map((item) => item.id);
    assert.deepEqual(firstIds, ["a1", "a2"]);

    const cursor = firstPayload.items[1]?.id;
    assert.equal(typeof cursor, "string");
    const second = await request(baseUrl, `/news?sources=coindesk&limit=2&cursor=${encodeURIComponent(cursor ?? "")}`);
    assert.equal(second.status, 200);
    const secondPayload = second.json as { items: NewsItem[] };
    const secondIds = secondPayload.items.map((item) => item.id);
    assert.deepEqual(secondIds, ["a3", "a4"]);
});

test("POST /news/diagnose redacts api_key from probe urls", async () => {
    process.env.NODE_ENV = "production";

    const testApiKey = "secret+token/with=special";
    process.env.COINDESK_API_KEY = testApiKey;

    const newsStore = makeStore([]);
    const newsSummaryStore = {
        async getLatest() {
            return null;
        },
        async putLatest(_summary: NewsSummaryResponse) {
            // no-op
        },
    };
    const newsSummaryService = {
        async summarize() {
            throw new Error("not used in this test");
        },
    };
    const newsService = {
        async refreshHeadlines() {
            return [];
        },
    };

    const app = express();
    app.use(express.json());
    app.use(createNewsRouter(
        newsService as never,
        newsStore as never,
        newsSummaryService as never,
        newsSummaryStore as never,
        { refreshSecret, siteUrl: "https://cryptowi.re" },
    ));

    const server = createServer(app);
    const baseUrl = await startServer(server);

    globalThis.fetch = async (input, init) => {
        const url = String(input);
        if (url.startsWith(baseUrl)) {
            return await originalFetch(input, init);
        }
        return new Response(
            JSON.stringify({
                Data: [],
            }),
            {
                status: 200,
                headers: { "content-type": "application/json" },
            },
        );
    };

    const res = await request(baseUrl, "/news/diagnose", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-refresh-secret": refreshSecret,
        },
        body: JSON.stringify({ limit: 5, sources: "coindesk" }),
    });

    assert.equal(res.status, 200);

    const payload = res.json as Record<string, unknown>;
    const probes = payload.probes as Record<string, unknown>;
    const withSources = probes.withSources as Record<string, unknown>;
    const withoutSources = probes.withoutSources as Record<string, unknown>;

    const urls = [withSources.url, withoutSources.url].filter((value): value is string => typeof value === "string");
    assert.equal(urls.length, 2);
    const encodedApiKey = encodeURIComponent(testApiKey);
    for (const url of urls) {
        assert.equal(url.includes("api_key="), false);
        assert.equal(url.includes(testApiKey), false);
        assert.equal(url.includes(encodedApiKey), false);
    }
});
