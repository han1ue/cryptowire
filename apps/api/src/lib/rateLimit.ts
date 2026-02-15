import type { NextFunction, Request, RequestHandler, Response } from "express";

type RateLimitOptions = {
    windowSeconds: number;
    defaultMaxRequests: number;
    summaryMaxRequests: number;
    adminMaxRequests: number;
};

type RateLimitProfile = {
    group: "read" | "summary" | "admin";
    limit: number;
};

type CounterRow = {
    count: number;
    expiresAtMs: number;
};

const counters = new Map<string, CounterRow>();
const kvEnabled = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
const MEMORY_SWEEP_INTERVAL_MS = 60_000;
let lastMemorySweepAtMs = 0;

const maybeSweepMemoryCounters = (nowMs: number) => {
    if (nowMs - lastMemorySweepAtMs < MEMORY_SWEEP_INTERVAL_MS) return;
    lastMemorySweepAtMs = nowMs;

    for (const [key, row] of counters.entries()) {
        if (row.expiresAtMs <= nowMs) counters.delete(key);
    }
};

const normalizeClientId = (raw: string): string =>
    raw
        .trim()
        .toLowerCase()
        .replace(/^::ffff:/, "")
        .replace(/[^\w.\-:]/g, "_");

const getClientId = (req: Request): string => {
    const forwardedFor = req.header("x-forwarded-for");
    if (forwardedFor) {
        const firstIp = forwardedFor.split(",")[0]?.trim();
        if (firstIp) return normalizeClientId(firstIp);
    }

    if (req.ip) return normalizeClientId(req.ip);
    return "unknown";
};

const getProfileForPath = (path: string, opts: RateLimitOptions): RateLimitProfile | null => {
    if (path === "/news/refresh" || path === "/news/summary/refresh" || path === "/news/diagnose") {
        return { group: "admin", limit: opts.adminMaxRequests };
    }

    if (path === "/news/summary") {
        return { group: "summary", limit: opts.summaryMaxRequests };
    }

    if (
        path === "/" ||
        path === "/health" ||
        path === "/stats" ||
        path === "/prices" ||
        path === "/market" ||
        path === "/rss.xml" ||
        path === "/news" ||
        path.startsWith("/news/")
    ) {
        return { group: "read", limit: opts.defaultMaxRequests };
    }

    return null;
};

const incrementCounter = async (key: string, windowSeconds: number, nowMs: number): Promise<number> => {
    if (kvEnabled) {
        try {
            const { kv } = await import("@vercel/kv");
            const count = await kv.incr(key);
            if (count === 1) {
                await kv.expire(key, windowSeconds + 1);
            }
            return count;
        } catch (error) {
            console.error("[api] rate-limit KV error, falling back to memory", error);
        }
    }

    maybeSweepMemoryCounters(nowMs);
    const row = counters.get(key);
    if (!row || row.expiresAtMs <= nowMs) {
        counters.set(key, { count: 1, expiresAtMs: nowMs + windowSeconds * 1000 });
        return 1;
    }

    row.count += 1;
    counters.set(key, row);
    return row.count;
};

const setRateLimitHeaders = (res: Response, limit: number, count: number, resetEpochSeconds: number) => {
    const remaining = Math.max(0, limit - count);
    res.setHeader("X-RateLimit-Limit", String(limit));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(resetEpochSeconds));
};

export const createRateLimitMiddleware = (opts: RateLimitOptions): RequestHandler => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const method = req.method.toUpperCase();
            if (method !== "GET" && method !== "HEAD") return next();

            const path = req.path || "/";
            const profile = getProfileForPath(path, opts);
            if (!profile || profile.limit <= 0) return next();
            const { group, limit } = profile;

            const nowMs = Date.now();
            const windowMs = opts.windowSeconds * 1000;
            const bucket = Math.floor(nowMs / windowMs);
            const resetEpochSeconds = Math.floor(((bucket + 1) * windowMs) / 1000);
            const clientId = getClientId(req);
            const key = `ratelimit:v1:${group}:${clientId}:${bucket}`;

            const count = await incrementCounter(key, opts.windowSeconds, nowMs);
            setRateLimitHeaders(res, limit, count, resetEpochSeconds);

            if (count > limit) {
                const retryAfter = Math.max(1, resetEpochSeconds - Math.floor(nowMs / 1000));
                res.setHeader("Retry-After", String(retryAfter));
                return res.status(429).json({
                    ok: false,
                    error: "Rate limit exceeded",
                    retryAfterSeconds: retryAfter,
                });
            }

            return next();
        } catch (error) {
            // Fail open: if limiter errors, don't block API availability.
            console.error("[api] rate-limit middleware error", error);
            return next();
        }
    };
};
