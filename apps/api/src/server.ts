import { loadDotEnvIfPresent } from "./env";

await loadDotEnvIfPresent();

const [{ app }, { getConfig }] = await Promise.all([import("./app"), import("./config")]);

const config = getConfig();

app.listen(config.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${config.PORT}`);
});
