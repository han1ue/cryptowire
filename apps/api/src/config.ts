import { z } from "zod";

const EnvSchema = z.object({
    PORT: z.coerce.number().int().positive().default(3001),

    // Public site URL (e.g. https://cryptowi.re). Used for canonical links in feeds.
    SITE_URL: z.string().url().optional(),

    NEWS_RETENTION_DAYS: z.coerce.number().int().positive().default(7),
    NEWS_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(180),
    NEWS_REFRESH_SECRET: z.string().optional(),
    NEWS_SUMMARY_FILE_PATH: z.string().optional(),
    CORS_ORIGIN: z.string().optional(),

    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().optional(),
    COINDESK_API_KEY: z.string().optional(),
    COINDESK_BASE_URL: z.string().url().optional(),
    COINDESK_NEWS_ENDPOINT_PATH: z.string().optional(),

    OPENAI_API_KEY: z.string().optional(),
    OPENAI_MODEL: z.string().optional(),
    AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().max(55_000).default(40_000),
});

export type AppConfig = z.infer<typeof EnvSchema>;

export const getConfig = (): AppConfig => {
    const parsed = EnvSchema.safeParse(process.env);
    if (!parsed.success) {
        throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
    }

    return parsed.data;
};
