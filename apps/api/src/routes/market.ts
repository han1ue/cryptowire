import { Router } from "express";
import type { MarketService } from "../services/marketService.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const createMarketRouter = (marketService: MarketService) => {
    const router = Router();

    router.get("/market", asyncHandler(async (_req, res) => {
        try {
            const overview = await marketService.getMarketOverview();
            return res.json({ ok: true, overview });
        } catch (err: unknown) {
            console.error("[market] overview fetch failed", err);
            return res.status(502).json({
                ok: false,
                error: "Upstream service unavailable",
            });
        }
    }));

    return router;
};
