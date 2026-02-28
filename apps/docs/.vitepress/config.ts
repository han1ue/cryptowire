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
          { text: "News (GET)", link: "/api#get-news" },
          { text: "News Sources (GET)", link: "/api#get-news-sources" },
          { text: "News Categories (GET)", link: "/api#get-news-categories" },
          { text: "News Status (GET)", link: "/api#get-news-status" },
          { text: "News Item (GET)", link: "/api#get-news-item-id" },
          { text: "News Summary (GET)", link: "/api#get-news-summary" },
          { text: "Prices (GET)", link: "/api#get-prices" },
          { text: "Market (GET)", link: "/api#get-market" },
          { text: "Health (GET)", link: "/api#get-health" },
          { text: "RSS (GET)", link: "/api#get-rss-xml" },
          { text: "News Refresh (POST)", link: "/api#post-news-refresh" },
          { text: "Summary Refresh (POST)", link: "/api#post-news-summary-refresh" },
          { text: "Diagnose (POST)", link: "/api#post-news-diagnose" },
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
