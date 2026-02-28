import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { CoindeskNewsProvider } from "./coindeskNews.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = originalFetch;
});

test("returns [] when API key is missing", async () => {
    const provider = new CoindeskNewsProvider({});
    const items = await provider.fetchHeadlines({ limit: 10, retentionDays: 7 });
    assert.deepEqual(items, []);
});

test("parses CoinDesk response and normalizes categories", async () => {
    const nowSecs = Math.floor(Date.now() / 1000);

    globalThis.fetch = async () =>
        new Response(
            JSON.stringify({
                Data: [
                    {
                        ID: 123,
                        TITLE: "Bitcoin jumps",
                        SUBTITLE: "Price action moves",
                        URL: "https://www.coindesk.com/example",
                        PUBLISHED_ON: nowSecs,
                        SOURCE_DATA: { SOURCE_KEY: "coindesk" },
                        CATEGORY_DATA: [{ CATEGORY: "Cryptocurrency" }, { CATEGORY: "Market" }],
                    },
                ],
            }),
            {
                status: 200,
                headers: { "content-type": "application/json" },
            },
        );

    const provider = new CoindeskNewsProvider({ apiKey: "test-key" });
    const items = await provider.fetchHeadlines({ limit: 10, retentionDays: 7 });

    assert.equal(items.length, 1);
    assert.equal(items[0]?.id, "123");
    assert.equal(items[0]?.source, "CoinDesk");
    assert.deepEqual(items[0]?.categories, ["Market"]);
});

test("infers source from URL host when source fields are missing", async () => {
    const nowSecs = Math.floor(Date.now() / 1000);

    globalThis.fetch = async () =>
        new Response(
            JSON.stringify({
                Data: [
                    {
                        ID: "abc",
                        TITLE: "Blockworks headline",
                        SUBTITLE: "Summary",
                        URL: "https://blockworks.co/news/example",
                        PUBLISHED_ON: nowSecs,
                    },
                ],
            }),
            {
                status: 200,
                headers: { "content-type": "application/json" },
            },
        );

    const provider = new CoindeskNewsProvider({ apiKey: "test-key" });
    const items = await provider.fetchHeadlines({ limit: 10, retentionDays: 7 });

    assert.equal(items.length, 1);
    assert.equal(items[0]?.source, "Blockworks");
});

test("filters out old items by retention window", async () => {
    const oldSecs = Math.floor(Date.now() / 1000) - 10 * 24 * 60 * 60;

    globalThis.fetch = async () =>
        new Response(
            JSON.stringify({
                Data: [
                    {
                        ID: "old",
                        TITLE: "Old headline",
                        SUBTITLE: "Old summary",
                        URL: "https://www.coindesk.com/old",
                        PUBLISHED_ON: oldSecs,
                        SOURCE_DATA: { SOURCE_KEY: "coindesk" },
                    },
                ],
            }),
            {
                status: 200,
                headers: { "content-type": "application/json" },
            },
        );

    const provider = new CoindeskNewsProvider({ apiKey: "test-key" });
    const items = await provider.fetchHeadlines({ limit: 10, retentionDays: 7 });

    assert.deepEqual(items, []);
});
