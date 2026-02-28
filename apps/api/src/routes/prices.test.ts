import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import type { ErrorRequestHandler } from "express";
import { createPricesRouter } from "./prices.js";

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

after(async () => {
    for (const server of runningServers) {
        await stopServer(server);
    }
    runningServers.clear();
});

test("GET /prices returns quotes from price service", async () => {
    const priceService = {
        async getStatus() {
            return { lastRefreshAt: new Date("2026-02-01T00:00:00.000Z").toISOString(), quoteCount: 2 };
        },
        async getStoredPrices() {
            return [
                {
                    symbol: "BTC",
                    usd: 100_000,
                    usd24hChange: 1.23,
                    fetchedAt: new Date("2026-02-01T00:00:00.000Z").toISOString(),
                },
            ];
        },
        async refreshPrices() {
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
    app.use(express.json());
    app.use(createPricesRouter(priceService as never, { refreshSecret }));
    const server = createServer(app);
    const baseUrl = await startServer(server);

    const response = await fetch(`${baseUrl}/prices?symbols=BTC`);
    const payload = (await response.json()) as { quotes: Array<{ symbol: string; usd: number }> };

    assert.equal(response.status, 200);
    assert.equal(payload.quotes.length, 1);
    assert.equal(payload.quotes[0]?.symbol, "BTC");
    assert.equal(payload.quotes[0]?.usd, 100_000);
});

test("GET /prices returns 503 before first refresh", async () => {
    const priceService = {
        async getStatus() {
            return { lastRefreshAt: null, quoteCount: 0 };
        },
        async getStoredPrices() {
            return [];
        },
        async refreshPrices() {
            return [];
        },
    };

    const app = express();
    app.use(express.json());
    app.use(createPricesRouter(priceService as never, { refreshSecret }));
    const server = createServer(app);
    const baseUrl = await startServer(server);

    const response = await fetch(`${baseUrl}/prices?symbols=BTC`);
    const payload = (await response.json()) as { error: string; hint: string };

    assert.equal(response.status, 503);
    assert.equal(payload.error, "Prices are not ready yet");
    assert.equal(payload.hint, "Run /prices/refresh from your scheduled job first.");
});

test("GET /prices returns 500 when price service throws", async () => {
    const priceService = {
        async getStatus() {
            return { lastRefreshAt: new Date("2026-02-01T00:00:00.000Z").toISOString(), quoteCount: 2 };
        },
        async getStoredPrices() {
            throw new Error("provider unavailable");
        },
        async refreshPrices() {
            return [];
        },
    };

    const app = express();
    app.use(express.json());
    app.use(createPricesRouter(priceService as never, { refreshSecret }));

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

test("GET /prices/status returns readiness metadata", async () => {
    const priceService = {
        async getStatus() {
            return { lastRefreshAt: new Date("2026-02-01T00:00:00.000Z").toISOString(), quoteCount: 8 };
        },
        async getStoredPrices() {
            return [];
        },
        async refreshPrices() {
            return [];
        },
    };

    const app = express();
    app.use(express.json());
    app.use(createPricesRouter(priceService as never, { refreshSecret }));
    const server = createServer(app);
    const baseUrl = await startServer(server);

    const response = await fetch(`${baseUrl}/prices/status`);
    const payload = (await response.json()) as {
        lastRefreshAt: string | null;
        quoteCount: number;
        ready: boolean;
        now: string;
    };

    assert.equal(response.status, 200);
    assert.equal(payload.quoteCount, 8);
    assert.equal(payload.ready, true);
    assert.equal(typeof payload.lastRefreshAt, "string");
    assert.equal(typeof payload.now, "string");
});

test("POST /prices/refresh rejects unauthorized requests", async () => {
    const priceService = {
        async getStatus() {
            return { lastRefreshAt: null, quoteCount: 0 };
        },
        async getStoredPrices() {
            return [];
        },
        async refreshPrices() {
            return [];
        },
    };

    const app = express();
    app.use(express.json());
    app.use(createPricesRouter(priceService as never, { refreshSecret }));
    const server = createServer(app);
    const baseUrl = await startServer(server);

    const response = await fetch(`${baseUrl}/prices/refresh`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
    });
    const payload = (await response.json()) as { error: string };

    assert.equal(response.status, 401);
    assert.equal(payload.error, "Unauthorized");
});

test("POST /prices/refresh succeeds with x-refresh-secret", async () => {
    const priceService = {
        async getStatus() {
            return { lastRefreshAt: null, quoteCount: 0 };
        },
        async getStoredPrices() {
            return [];
        },
        async refreshPrices() {
            return [
                {
                    symbol: "BTC",
                    usd: 100_000,
                    usd24hChange: 1.23,
                    fetchedAt: new Date("2026-02-01T00:00:00.000Z").toISOString(),
                },
                {
                    symbol: "ETH",
                    usd: 5_000,
                    usd24hChange: 0.42,
                    fetchedAt: new Date("2026-02-01T00:00:00.000Z").toISOString(),
                },
            ];
        },
    };

    const app = express();
    app.use(express.json());
    app.use(createPricesRouter(priceService as never, { refreshSecret }));
    const server = createServer(app);
    const baseUrl = await startServer(server);

    const response = await fetch(`${baseUrl}/prices/refresh`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-refresh-secret": refreshSecret,
        },
        body: "{}",
    });
    const payload = (await response.json()) as { ok: boolean; count: number };

    assert.equal(response.status, 200);
    assert.equal(payload.ok, true);
    assert.equal(payload.count, 2);
});

test("GET /prices/refresh is method-restricted", async () => {
    const priceService = {
        async getStatus() {
            return { lastRefreshAt: null, quoteCount: 0 };
        },
        async getStoredPrices() {
            return [];
        },
        async refreshPrices() {
            return [];
        },
    };

    const app = express();
    app.use(express.json());
    app.use(createPricesRouter(priceService as never, { refreshSecret }));
    const server = createServer(app);
    const baseUrl = await startServer(server);

    const response = await fetch(`${baseUrl}/prices/refresh`);
    const payload = (await response.json()) as { error: string };

    assert.equal(response.status, 405);
    assert.equal(payload.error, "Method not allowed. Use POST with x-refresh-secret header.");
});
