import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { CoinGeckoPriceProvider } from "./coingeckoPrices.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = originalFetch;
});

test("fetches quotes and passes an AbortSignal to upstream request", async () => {
    let sawSignal = false;

    globalThis.fetch = async (_input, init) => {
        sawSignal = Boolean(init?.signal);
        return new Response(
            JSON.stringify({
                bitcoin: {
                    usd: 100_000,
                    usd_24h_change: 2.5,
                },
            }),
            {
                status: 200,
                headers: { "content-type": "application/json" },
            },
        );
    };

    const provider = new CoinGeckoPriceProvider();
    const quotes = await provider.fetchPrices({ symbols: ["BTC"] });

    assert.equal(sawSignal, true);
    assert.equal(quotes.length, 1);
    assert.equal(quotes[0]?.symbol, "BTC");
    assert.equal(quotes[0]?.usd, 100_000);
    assert.equal(quotes[0]?.usd24hChange, 2.5);
});
