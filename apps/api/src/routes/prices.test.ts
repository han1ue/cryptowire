import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import type { ErrorRequestHandler } from "express";
import { createPricesRouter } from "./prices.js";

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

test("GET /prices returns quotes from price service", async () => {
    const priceService = {
        async getPrices() {
            return [
                {
                    symbol: "BTC",
                    usd: 100_000,
                    usd24hChange: 1.23,
                    fetchedAt: new Date("2026-02-01T00:00:00.000Z").toISOString(),
                },
            ];
        },
    };

    const app = express();
    app.use(createPricesRouter(priceService as never));
    const server = createServer(app);
    const baseUrl = await startServer(server);

    const response = await fetch(`${baseUrl}/prices?symbols=BTC`);
    const payload = (await response.json()) as { quotes: Array<{ symbol: string; usd: number }> };

    assert.equal(response.status, 200);
    assert.equal(payload.quotes.length, 1);
    assert.equal(payload.quotes[0]?.symbol, "BTC");
    assert.equal(payload.quotes[0]?.usd, 100_000);
});

test("GET /prices returns 500 when price service throws", async () => {
    const priceService = {
        async getPrices() {
            throw new Error("provider unavailable");
        },
    };

    const app = express();
    app.use(createPricesRouter(priceService as never));

    const errorHandler: ErrorRequestHandler = (_error, _req, res, _next) => {
        if (res.headersSent) return;
        res.status(500).json({ ok: false, error: "Internal server error" });
    };
    app.use(errorHandler);

    const server = createServer(app);
    const baseUrl = await startServer(server);

    const response = await fetch(`${baseUrl}/prices?symbols=BTC`);
    const payload = (await response.json()) as { ok: boolean; error: string };

    assert.equal(response.status, 500);
    assert.equal(payload.ok, false);
    assert.equal(payload.error, "Internal server error");
});
