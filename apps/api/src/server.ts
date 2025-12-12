import { loadDotEnvIfPresent } from "./env.js";

await loadDotEnvIfPresent();

const [{ app }, { getConfig }] = await Promise.all([import("./app.js"), import("./config.js")]);

const config = getConfig();

app.listen(config.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${config.PORT}`);
});
