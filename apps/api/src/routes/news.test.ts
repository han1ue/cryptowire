import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { app as AppType } from "../app.js";

let server: Server;
let baseUrl = "";

const refreshSecret = "test-refresh-secret";

const parseJson = (raw: string): unknown => {
    try {
        return JSON.parse(raw) as unknown;
    } catch {
        return null;
    }
};

const request = async (path: string, init?: RequestInit) => {
    const response = await fetch(baseUrl + path, init);
    const text = await response.text();
    return {
        status: response.status,
        headers: response.headers,
        text,
        json: parseJson(text),
    };
};

before(async () => {
    process.env.NODE_ENV = "production";
    process.env.SITE_URL = "https://cryptowi.re";
    process.env.NEWS_REFRESH_SECRET = refreshSecret;
    delete process.env.COINDESK_API_KEY;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;

    const mod = await import("../app.js");
    const app: typeof AppType = mod.app;

    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

    const address = server.address();
    assert(address && typeof address === "object");
    baseUrl = `http://127.0.0.1:${(address as AddressInfo).port}`;
});

after(async () => {
    await new Promise<void>((resolve, reject) => {
        server.close((err) => {
            if (err) return reject(err);
            resolve();
        });
    });
});

test("POST /news/refresh rejects unauthorized requests", async () => {
    const res = await request("/news/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
    });

    assert.equal(res.status, 401);
    assert.deepEqual(res.json, { error: "Unauthorized" });
});

test("POST /news/refresh does not trust x-vercel-cron header", async () => {
    const res = await request("/news/refresh", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-vercel-cron": "1",
        },
        body: "{}",
    });

    assert.equal(res.status, 401);
    assert.deepEqual(res.json, { error: "Unauthorized" });
});

test("POST /news/refresh succeeds with x-refresh-secret", async () => {
    const res = await request("/news/refresh", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-refresh-secret": refreshSecret,
        },
        body: "{}",
    });

    assert.equal(res.status, 200);
    const payload = res.json as Record<string, unknown> | null;
    assert(payload && typeof payload === "object");
    assert.equal(payload.ok, true);
    assert.equal(typeof payload.count, "number");
});

test("GET /news/refresh is method-restricted", async () => {
    const res = await request("/news/refresh");
    assert.equal(res.status, 405);
    assert.deepEqual(res.json, { error: "Method not allowed. Use POST with x-refresh-secret header." });
});

test("POST /news/summary/refresh enforces x-refresh-secret", async () => {
    const unauthorized = await request("/news/summary/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
    });
    assert.equal(unauthorized.status, 401);

    const authorized = await request("/news/summary/refresh", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-refresh-secret": refreshSecret,
        },
        body: JSON.stringify({ hours: 24, limit: 50 }),
    });
    assert.equal(authorized.status, 200);
});

test("GET /news/summary/refresh is method-restricted", async () => {
    const res = await request("/news/summary/refresh");
    assert.equal(res.status, 405);
    assert.deepEqual(res.json, { error: "Method not allowed. Use POST with x-refresh-secret header." });
});

test("GET /rss.xml returns RSS with canonical self link", async () => {
    const res = await request("/rss.xml");
    assert.equal(res.status, 200);

    const contentType = res.headers.get("content-type") ?? "";
    assert(contentType.includes("application/rss+xml"));
    assert.match(res.text, /<atom:link href="https:\/\/cryptowi\.re\/rss\.xml"/);
});
