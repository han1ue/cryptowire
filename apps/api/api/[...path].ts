import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const { app } = await import("../src/app.js");
        return (app as unknown as (req: unknown, res: unknown) => unknown)(req, res);
    } catch (error) {
        // Ensure we always return a response instead of letting the function crash.
        console.error("[api] serverless handler error", error);

        const message = error instanceof Error ? error.message : String(error);
        return res.status(500).json({
            ok: false,
            error: "Serverless function error",
            message,
        });
    }
}
