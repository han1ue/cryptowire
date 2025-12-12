import { Router } from "express";
import type { MarketService } from "../services/marketService.js";

export const createMarketRouter = (marketService: MarketService) => {
  const router = Router();

  router.get("/market", async (_req, res) => {
    try {
      const overview = await marketService.getMarketOverview();
      return res.json({ ok: true, overview });
    } catch (err: any) {
      return res.status(502).json({
        ok: false,
        error: String(err?.message ?? err),
      });
    }
  });

  return router;
};
