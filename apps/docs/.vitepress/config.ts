import { defineConfig } from "vitepress";

export default defineConfig({
  title: "cryptowi.re docs",
  description: "Documentation for the cryptowi.re news aggregator.",
  lang: "en-US",
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: "API", link: "/api" },
      { text: "Widget", link: "/widget" },
      { text: "Agent Skill", link: "/agent-skill" }
    ],
    sidebar: [
      {
        text: "Docs",
        items: [
          { text: "Start", link: "/" },
          { text: "API", link: "/api" },
          { text: "Widget", link: "/widget" },
          { text: "Agent Skill", link: "/agent-skill" },
        ]
      }
    ],
    search: {
      provider: "local"
    }
  }
});
