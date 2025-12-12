import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const { default: app } = await import("../../src/app.js");
        return app(req as any, res as any);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[api] serverless handler error", error);

        const message = error instanceof Error ? error.message : String(error);
        return res.status(500).json({
            ok: false,
            error: "Serverless function error",
            message,
        });
    }
}
