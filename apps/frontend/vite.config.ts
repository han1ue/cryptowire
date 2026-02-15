import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/news": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/prices": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/market": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/health": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/stats": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/rss.xml": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@cryptowire/types/sources", replacement: path.resolve(__dirname, "../../packages/types/src/sources.ts") },
      { find: "@cryptowire/types", replacement: path.resolve(__dirname, "../../packages/types/src/index.ts") },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
}));
