import fs from "node:fs";
import path from "node:path";

const findUp = (filename: string, startDir: string): string | null => {
    let dir = startDir;
    for (let i = 0; i < 8; i++) {
        const candidate = path.join(dir, filename);
        if (fs.existsSync(candidate)) return candidate;
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return null;
};

export const loadDotEnvIfPresent = async () => {
    // Optional: local dev convenience. In Vercel, env vars are already injected.
    const envPath = findUp(".env", process.cwd());
    if (!envPath) {
        // eslint-disable-next-line no-console
        console.error("[env] .env not found starting from", process.cwd());
        return;
    }

    const dotenv = await import("dotenv");
    const result = dotenv.config({ path: envPath });
    // eslint-disable-next-line no-console
    console.error("[env] Loaded .env from", envPath, "error?", result.error);
};
