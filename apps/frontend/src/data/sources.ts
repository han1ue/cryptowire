export const sources = [
    {
        id: "coindesk",
        name: "CoinDesk",
    },
    {
        id: "decrypt",
        name: "Decrypt",
    },
    {
        id: "cointelegraph",
        name: "Cointelegraph",
    },
    {
        id: "blockworks",
        name: "Blockworks",
    },
    {
        id: "bitcoin.com",
        name: "bitcoin.com",
    },
    {
        id: "cryptopotato",
        name: "CryptoPotato",
    },
    {
        id: "forbes",
        name: "Forbes",
    },
    {
        id: "cryptopolitan",
        name: "Cryptopolitan",
    },
    {
        id: "coinpaprika",
        name: "CoinPaprika",
    },
    {
        id: "seekingalpha",
        name: "SeekingAlpha",
    },
    {
        id: "bitcoinist",
        name: "Bitcoinist",
    },
    {
        id: "newsbtc",
        name: "NewsBTC",
    },
    {
        id: "utoday",
        name: "U.Today",
    },
    {
        id: "investing_comcryptonews",
        name: "Investing.com",
    },
    {
        id: "ethereumfoundation",
        name: "Ethereum Foundation",
    },
    {
        id: "bitcoincore",
        name: "Bitcoin Core",
    },
] as const satisfies readonly { id: string; name: string }[];

export type SourceId = (typeof sources)[number]["id"];
export type SourceName = (typeof sources)[number]["name"];

