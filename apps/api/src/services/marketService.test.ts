import assert from "node:assert/strict";
import { test } from "node:test";
import { MarketService } from "./marketService.js";

const makeGlobalPayload = () => ({
    data: {
        total_market_cap: { usd: 1_000_000_000_000 },
        total_volume: { usd: 50_000_000_000 },
        market_cap_percentage: { btc: 52.4 },
        market_cap_change_percentage_24h_usd: 1.2,
        updated_at: 1_706_000_000,
    },
});

const makeFearGreedPayload = () => ({
    data: [
        {
            value: "63",
            value_classification: "Greed",
            timestamp: "1706000000",
            time_until_update: "12345",
        },
    ],
});

test("MarketService sends abort signals and caches successful responses", async () => {
    const calls: Array<{ url: string; signalPresent: boolean }> = [];

    const fetchMock: typeof fetch = async (input, init) => {
        const url = String(input);
        calls.push({ url, signalPresent: Boolean(init?.signal) });

        if (url.includes("/global")) {
            return new Response(JSON.stringify(makeGlobalPayload()), {
                status: 200,
                headers: { "content-type": "application/json" },
            });
        }

        return new Response(JSON.stringify(makeFearGreedPayload()), {
            status: 200,
            headers: { "content-type": "application/json" },
        });
    };

    const service = new MarketService(fetchMock, 5_000);

    const first = await service.getMarketOverview();
    const second = await service.getMarketOverview();

    assert.equal(first.marketCapUsd, 1_000_000_000_000);
    assert.equal(first.fearGreed.value, 63);
    assert.equal(second.marketCapUsd, first.marketCapUsd);
    assert.equal(calls.length, 2);
    assert.equal(calls.every((call) => call.signalPresent), true);
});

test("MarketService surfaces timeout failures", async () => {
    const fetchMock: typeof fetch = async (_input, init) =>
        await new Promise<Response>((_resolve, reject) => {
            const signal = init?.signal as AbortSignal | undefined;
            if (!signal) {
                reject(new Error("missing abort signal"));
                return;
            }

            if (signal.aborted) {
                const abortError = new Error("aborted");
                abortError.name = "AbortError";
                reject(abortError);
                return;
            }

            signal.addEventListener(
                "abort",
                () => {
                    const abortError = new Error("aborted");
                    abortError.name = "AbortError";
                    reject(abortError);
                },
                { once: true },
            );
        });

    const service = new MarketService(fetchMock, 5);
    await assert.rejects(() => service.getMarketOverview(), /timed out/i);
});
