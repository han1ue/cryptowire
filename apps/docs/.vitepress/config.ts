import { defineConfig } from "vitepress";

export default defineConfig({
  title: "cryptowi.re docs",
  description: "Documentation for the cryptowi.re news aggregator.",
  lang: "en-US",
  cleanUrls: true,
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
    ["link", { rel: "alternate icon", href: "/favicon.ico" }],
    ["link", { rel: "apple-touch-icon", href: "/apple-touch-icon.png" }],
  ],
  themeConfig: {
    logo: "/logo-mark.svg",
    outline: [2, 3],
    nav: [
      { text: "API", link: "/api" },
      { text: "Widget", link: "/widget" },
      { text: "References", link: "/references/sources" },
      { text: "Agent Instructions", link: "/agent-skill" }
    ],
    sidebar: [
      {
        text: "Docs",
        items: [
          { text: "API", link: "/api" },
          { text: "Widget", link: "/widget" },
          { text: "Agent Instructions", link: "/agent-skill" },
        ]
      },
      {
        text: "References",
        items: [
          { text: "Sources", link: "/references/sources" },
        ]
      }
    ],
    search: {
      provider: "local"
    }
  }
});
