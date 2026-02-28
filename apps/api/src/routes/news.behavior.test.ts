import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import type { NewsItem, NewsSummaryResponse } from "@cryptowire/types";
import { createNewsRouter } from "./news.js";

const runningServers = new Set<Server>();
const refreshSecret = "test-refresh-secret";

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
        async getPage(params: { limit: number; offset: number }) {
            return items.slice(params.offset, params.offset + params.limit);
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
