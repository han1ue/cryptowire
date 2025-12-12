import express from "express";
import cors from "cors";
import { getConfig } from "./config";
import { NewsService } from "./services/newsService";
import { PriceService } from "./services/priceService";
import { createNewsRouter } from "./routes/news";
import { createPricesRouter } from "./routes/prices";
import { createNewsStore } from "./stores/newsStore";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
});

const config = getConfig();
const newsService = new NewsService(config);
const newsStore = createNewsStore();
const priceService = new PriceService(config);

app.use("/api", createNewsRouter(newsService, newsStore, { refreshSecret: config.NEWS_REFRESH_SECRET }));
app.use("/api", createPricesRouter(priceService));
