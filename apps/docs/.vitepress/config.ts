import { defineConfig } from "vitepress";

export default defineConfig({
  title: "CryptoWire Docs",
  description: "Documentation for the CryptoWire API and monorepo setup.",
  lang: "en-US",
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: "Guide", link: "/getting-started" },
      { text: "API", link: "/api" },
      { text: "Deploy", link: "/deployment" }
    ],
    sidebar: [
      {
        text: "Start",
        items: [
          { text: "Introduction", link: "/" },
          { text: "Getting Started", link: "/getting-started" }
        ]
      },
      {
        text: "Reference",
        items: [
          { text: "API Endpoints", link: "/api" },
          { text: "Deployment", link: "/deployment" }
        ]
      }
    ],
    search: {
      provider: "local"
    }
  }
});
