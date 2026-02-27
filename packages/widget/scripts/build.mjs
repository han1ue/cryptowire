import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(packageRoot, "..", "..");
const distDir = path.join(packageRoot, "dist");

const frontendLoaderPath = path.join(repoRoot, "apps", "frontend", "public", "widget", "widget.js");

await fs.rm(distDir, { recursive: true, force: true });
await fs.mkdir(distDir, { recursive: true });

await build({
  entryPoints: [path.join(packageRoot, "src", "index.js")],
  outfile: path.join(distDir, "index.js"),
  bundle: true,
  format: "esm",
  target: "es2020",
  sourcemap: false,
  minify: false,
});

await build({
  entryPoints: [path.join(packageRoot, "src", "loader-global.js")],
  outfile: path.join(distDir, "widget.js"),
  bundle: true,
  format: "iife",
  globalName: "CryptoWireWidget",
  target: "es2018",
  sourcemap: false,
  minify: true,
});

await fs.copyFile(path.join(packageRoot, "src", "index.d.ts"), path.join(distDir, "index.d.ts"));
await fs.mkdir(path.dirname(frontendLoaderPath), { recursive: true });
await fs.copyFile(path.join(distDir, "widget.js"), frontendLoaderPath);

console.log("[widget] built npm package and synced apps/frontend/public/widget/widget.js");
