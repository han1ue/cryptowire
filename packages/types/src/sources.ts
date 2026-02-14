export const SUPPORTED_NEWS_SOURCES = [
    { id: "coindesk", name: "CoinDesk" },
    { id: "decrypt", name: "Decrypt" },
    { id: "cointelegraph", name: "Cointelegraph" },
    { id: "blockworks", name: "Blockworks" },
    { id: "bitcoin.com", name: "bitcoin.com" },
    { id: "cryptopotato", name: "CryptoPotato" },
    { id: "forbes", name: "Forbes" },
    { id: "cryptopolitan", name: "Cryptopolitan" },
    { id: "coinpaprika", name: "CoinPaprika" },
    { id: "seekingalpha", name: "SeekingAlpha" },
    { id: "bitcoinist", name: "Bitcoinist" },
    { id: "newsbtc", name: "NewsBTC" },
    { id: "utoday", name: "U.Today" },
    { id: "investing_comcryptonews", name: "Investing.com" },
    { id: "ethereumfoundation", name: "Ethereum Foundation" },
    { id: "bitcoincore", name: "Bitcoin Core" },
] as const;

export type NewsSourceId = (typeof SUPPORTED_NEWS_SOURCES)[number]["id"];
export type NewsSourceName = (typeof SUPPORTED_NEWS_SOURCES)[number]["name"];
