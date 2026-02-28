import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import { createMarketRouter } from "./market.js";

const runningServers = new Set<Server>();

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

after(async () => {
    for (const server of runningServers) {
        await stopServer(server);
    }
    runningServers.clear();
});

test("GET /market returns market overview", async () => {
    const marketService = {
        async getMarketOverview() {
            return {
                marketCapUsd: 1,
                marketCapChange24hPct: 2,
                volume24hUsd: 3,
                btcDominancePct: 4,
                updatedAt: 5,
                fearGreed: {
                    value: 60,
                    classification: "Greed",
                    timestamp: 6,
                },
            };
        },
    };

    const app = express();
    app.use(createMarketRouter(marketService as never));
    const server = createServer(app);
    const baseUrl = await startServer(server);

    const response = await fetch(`${baseUrl}/market`);
    const payload = (await response.json()) as { ok: boolean; overview?: { marketCapUsd: number } };

    assert.equal(response.status, 200);
    assert.equal(payload.ok, true);
    assert.equal(payload.overview?.marketCapUsd, 1);
});

test("GET /market returns 502 when market service throws", async () => {
    const marketService = {
        async getMarketOverview() {
            throw new Error("upstream failed");
        },
    };

    const app = express();
    app.use(createMarketRouter(marketService as never));
    const server = createServer(app);
    const baseUrl = await startServer(server);

    const response = await fetch(`${baseUrl}/market`);
    const payload = (await response.json()) as { ok: boolean; error: string };

    assert.equal(response.status, 502);
    assert.equal(payload.ok, false);
    assert.equal(payload.error, "Upstream service unavailable");
});
