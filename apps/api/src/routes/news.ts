import { Router } from "express";
import { z } from "zod";
import { NewsListResponseSchema } from "@cryptowire/types";
import type { NewsService } from "../services/newsService.js";
import type { NewsStore } from "../stores/newsStore.js";

export const createNewsRouter = (
    newsService: NewsService,
    newsStore: NewsStore,
    opts?: { refreshSecret?: string },
) => {
    const router = Router();

    const kvEnabled = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
    const KV_LAST_REFRESH_KEY = "news:lastRefreshAt";
    const setLastRefreshAt = async (iso: string) => {
        if (!kvEnabled) return;
        try {
            const { kv } = await import("@vercel/kv");
            // keep for a bit longer than retention so it's visible even if cache is empty
            await kv.set(KV_LAST_REFRESH_KEY, iso, { ex: 8 * 24 * 60 * 60 });
        } catch {
            // ignore
        }
    };

    router.get("/news/refresh", async (req, res) => {
        const querySchema = z.object({
            limit: z.coerce.number().int().positive().max(500).default(100),
            retentionDays: z.coerce.number().int().positive().max(30).optional(),
            force: z
                .union([z.literal("1"), z.literal("true"), z.literal("0"), z.literal("false")])
                .optional()
                .transform((v) => v === "1" || v === "true"),
            secret: z.string().optional(),
        });

        const parsed = querySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.message });
        }

        // Optional protection for cron/warm endpoints.
        // Vercel Cron requests include `x-vercel-cron: 1`, which we allow.
        const expected = opts?.refreshSecret;
        const isVercelCron = req.header("x-vercel-cron") === "1";
        if (!isVercelCron && expected && parsed.data.secret !== expected && req.header("x-refresh-secret") !== expected) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const limit = Math.min(parsed.data.limit, 500);
        const retentionDays = Math.min(parsed.data.retentionDays ?? 7, 7);
        const items = await newsService.refreshHeadlines({
            limit,
            retentionDays,
            force: parsed.data.force,
        });

        await newsStore.putMany(items);

        // Keep only up to one week old in storage.
        const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
        await newsStore.pruneOlderThan(cutoff);

        await setLastRefreshAt(new Date().toISOString());

        return res.json({ ok: true, count: items.length, refreshedAt: new Date().toISOString() });
    });

    router.get("/news", async (req, res) => {
        const querySchema = z.object({
            // Accept a larger input range but clamp below to keep providers happy.
            limit: z.coerce.number().int().positive().max(500).default(30),
            offset: z.coerce.number().int().min(0).max(10_000).default(0),
            retentionDays: z.coerce.number().int().positive().max(30).optional(),
        });

        const parsed = querySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.message });
        }

        const limit = Math.min(parsed.data.limit, 100);
        const offset = parsed.data.offset;
        const retentionDays = Math.min(parsed.data.retentionDays ?? 7, 7);

        // Serve from store (KV/in-memory). This avoids hitting upstream on every user request.
        let items = await newsStore.getPage({ limit, offset });
        if (items.length === 0 && offset === 0) {
            // Cold start: warm the store once.
            const warmed = await newsService.refreshHeadlines({
                limit: 200,
                retentionDays,
                force: true,
            });
            await newsStore.putMany(warmed);
            const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
            await newsStore.pruneOlderThan(cutoff);
            await setLastRefreshAt(new Date().toISOString());
            items = await newsStore.getPage({ limit, offset });
        }

        const payload = { items };
        const validated = NewsListResponseSchema.safeParse(payload);
        if (!validated.success) {
            return res.status(500).json({ error: "Invalid response shape" });
        }

        return res.json(payload);
    });

    return router;
};
