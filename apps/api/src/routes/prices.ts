import { Router, type Request } from "express";
import { z } from "zod";
import { PriceResponseSchema } from "@cryptowire/types";
import type { PriceService } from "../services/priceService.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const DEFAULT_SYMBOLS = "BTC,ETH,SOL,BNB,XRP,ADA,DOGE,AVAX";

export const createPricesRouter = (
    priceService: PriceService,
    opts?: { refreshSecret?: string },
) => {
    const router = Router();
    const isProd = process.env.NODE_ENV === "production";
    const refreshSecret = opts?.refreshSecret?.trim() ?? "";

    const isRefreshAuthorized = (req: Request) => {
        if (!refreshSecret) return !isProd;
        return req.header("x-refresh-secret") === refreshSecret;
    };

    router.get("/prices", asyncHandler(async (req, res) => {
        const querySchema = z.object({
            symbols: z
                .string()
                .default(DEFAULT_SYMBOLS)
                .transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean)),
        });

        const parsed = querySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.message });
        }

        const status = await priceService.getStatus();
        if (!status.lastRefreshAt || status.quoteCount === 0) {
            return res.status(503).json({
                error: "Prices are not ready yet",
                hint: "Run /prices/refresh from your scheduled job first.",
            });
        }

        const quotes = await priceService.getStoredPrices({ symbols: parsed.data.symbols });
        const payload = { quotes };

        const validated = PriceResponseSchema.safeParse(payload);
        if (!validated.success) {
            return res.status(500).json({ error: "Invalid response shape" });
        }

        return res.json(payload);
    }));

    router.get("/prices/status", asyncHandler(async (_req, res) => {
        const status = await priceService.getStatus();
        return res.json({
            lastRefreshAt: status.lastRefreshAt,
            quoteCount: status.quoteCount,
            ready: Boolean(status.lastRefreshAt && status.quoteCount > 0),
            now: new Date().toISOString(),
        });
    }));

    const refreshSchema = z.object({
        symbols: z
            .string()
            .default(DEFAULT_SYMBOLS)
            .transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean)),
    });

    router.post("/prices/refresh", asyncHandler(async (req, res) => {
        if (!isRefreshAuthorized(req)) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const parsed = refreshSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.message });
        }

        const quotes = await priceService.refreshPrices({ symbols: parsed.data.symbols });
        return res.json({
            ok: true,
            count: quotes.length,
            symbols: parsed.data.symbols,
            refreshedAt: new Date().toISOString(),
            note: quotes.length === 0 ? "No quotes fetched. Existing cache may be stale or empty." : null,
        });
    }));

    router.get("/prices/refresh", asyncHandler(async (_req, res) => {
        return res.status(405).json({ error: "Method not allowed. Use POST with x-refresh-secret header." });
    }));

    return router;
};
