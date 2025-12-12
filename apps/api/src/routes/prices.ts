import { Router } from "express";
import { z } from "zod";
import { PriceResponseSchema } from "@cryptowire/types";
import type { PriceService } from "../services/priceService";

export const createPricesRouter = (priceService: PriceService) => {
    const router = Router();

    router.get("/prices", async (req, res) => {
        const querySchema = z.object({
            symbols: z
                .string()
                .default("BTC,ETH,SOL,BNB,XRP,ADA,DOGE,AVAX")
                .transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean)),
        });

        const parsed = querySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.message });
        }

        const quotes = await priceService.getPrices({ symbols: parsed.data.symbols });
        const payload = { quotes };

        const validated = PriceResponseSchema.safeParse(payload);
        if (!validated.success) {
            return res.status(500).json({ error: "Invalid response shape" });
        }

        return res.json(payload);
    });

    return router;
};
