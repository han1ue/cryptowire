import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { getConfig } from "./config.js";

const ORIGINAL_ENV = { ...process.env };

const resetEnv = () => {
    for (const key of Object.keys(process.env)) {
        if (!(key in ORIGINAL_ENV)) delete process.env[key];
    }
    for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
        if (typeof value === "string") process.env[key] = value;
    }
};

afterEach(() => {
    resetEnv();
});

test("getConfig requires SITE_URL in production", () => {
    resetEnv();
    process.env.NODE_ENV = "production";
    delete process.env.SITE_URL;

    assert.throws(() => getConfig(), /SITE_URL is required in production/);
});

test("getConfig accepts SITE_URL in production", () => {
    resetEnv();
    process.env.NODE_ENV = "production";
    process.env.SITE_URL = "https://cryptowi.re";

    const config = getConfig();
    assert.equal(config.SITE_URL, "https://cryptowi.re");
});
