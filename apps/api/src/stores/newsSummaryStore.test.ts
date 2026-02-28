import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { NewsSummaryResponse } from "@cryptowire/types";
import { createNewsSummaryStore } from "./newsSummaryStore.js";

const ORIGINAL_ENV = { ...process.env };

const resetEnv = () => {
    for (const key of Object.keys(process.env)) {
        if (!(key in ORIGINAL_ENV)) delete process.env[key];
    }
    for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
        if (typeof value === "string") process.env[key] = value;
    }
};

const makeSummary = (generatedAt: string): NewsSummaryResponse => ({
    generatedAt,
    windowStart: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    windowEnd: new Date("2026-01-02T00:00:00.000Z").toISOString(),
    windowHours: 24,
    articleCount: 3,
    model: "test-model",
    aiError: null,
    summary: "Test summary",
    highlights: [
        {
            title: "Test highlight",
            detail: "Test detail",
            sources: ["CoinDesk"],
            url: "https://www.coindesk.com/example",
        },
    ],
    sourceCoverage: [
        {
            sourceId: "coindesk",
            source: "CoinDesk",
            articleCount: 3,
            reputationWeight: 0.95,
        },
    ],
});

afterEach(() => {
    resetEnv();
});

test("summary store uses in-memory state when KV is disabled", async () => {
    resetEnv();
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;

    const store = createNewsSummaryStore();

    assert.equal(await store.getLatest(), null);

    const summary = makeSummary(new Date("2026-01-02T01:00:00.000Z").toISOString());
    await store.putLatest(summary);

    const loaded = await store.getLatest();
    assert.deepEqual(loaded, summary);
});
