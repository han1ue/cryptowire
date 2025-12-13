export const sources = [
    {
        id: "coindesk",
        name: "CoinDesk",
        icon: "📰",
    },
    {
        id: "decrypt",
        name: "Decrypt",
        icon: "🧩",
    },
    {
        id: "cointelegraph",
        name: "Cointelegraph",
        icon: "📣",
    },
    {
        id: "blockworks",
        name: "Blockworks",
        icon: "🧵",
    },
    {
        id: "bitcoin.com",
        name: "bitcoin.com",
        icon: "₿",
    },
] as const;

export type SourceId = (typeof sources)[number]["id"];
export type SourceName = (typeof sources)[number]["name"];
