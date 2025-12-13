import { z } from "zod";

const EnvSchema = z.object({
    PORT: z.coerce.number().int().positive().default(3001),

    NEWS_RETENTION_DAYS: z.coerce.number().int().positive().default(7),
    NEWS_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(180),
    NEWS_REFRESH_SECRET: z.string().optional(),

    COINDESK_API_KEY: z.string().optional(),
    COINDESK_BASE_URL: z.string().url().optional(),
    COINDESK_NEWS_ENDPOINT_PATH: z.string().optional(),
});

export type AppConfig = z.infer<typeof EnvSchema>;

export const getConfig = (): AppConfig => {
    const parsed = EnvSchema.safeParse(process.env);
    if (!parsed.success) {
        throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
    }

    return parsed.data;
};
