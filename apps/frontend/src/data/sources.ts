export const sources = [
    {
        name: "The Block",
        icon: "📊",
    },
    {
        name: "CoinDesk",
        icon: "📰",
    },
    {
        name: "Decrypt",
        icon: "🧩",
    },
    {
        name: "Cointelegraph",
        icon: "📣",
    },
] as const;

export type SourceName = (typeof sources)[number]["name"];
