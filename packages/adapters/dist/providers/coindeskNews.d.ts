import type { NewsItem, NewsProvider, FetchHeadlinesParams } from "@cryptowire/types";
export declare class CoindeskNewsProvider implements NewsProvider {
    private readonly options;
    readonly name = "CoinDesk";
    constructor(options: {
        apiKey?: string;
        baseUrl?: string;
        endpointPath?: string;
        sourceIds?: string;
    });
    fetchHeadlines(params: FetchHeadlinesParams): Promise<NewsItem[]>;
}
//# sourceMappingURL=coindeskNews.d.ts.map