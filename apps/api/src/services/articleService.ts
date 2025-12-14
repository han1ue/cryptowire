import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

export type ParsedArticle = {
    title: string | null;
    byline: string | null;
    excerpt: string | null;
    siteName: string | null;
    contentHtml: string | null;
    textContent: string | null;
};

const stripHtmlToText = (html: string): string => {
    const dom = new JSDOM(`<body>${html}</body>`);
    return dom.window.document.body.textContent?.replace(/\s+/g, " ").trim() ?? "";
};

const getSlugFromPathname = (pathname: string): string | null => {
    const segments = pathname
        .split("/")
        .map((s) => s.trim())
        .filter(Boolean);
    if (segments.length === 0) return null;
    return segments[segments.length - 1] ?? null;
};

type BitcoinComWpPost = {
    title?: { rendered?: string };
    content?: { rendered?: string };
    excerpt?: { rendered?: string };
    bcn_author?: { name?: string };
    yoast_head_json?: { og_site_name?: string };
};

const truncateDomAtSentinelText = (html: string, sentinel: RegExp): string => {
    const dom = new JSDOM(`<body>${html}</body>`);
    const { document } = dom.window;

    const preferredSelectors = "h1,h2,h3,h4,h5,h6";
    const preferred = Array.from(document.querySelectorAll(preferredSelectors));
    const all = Array.from(document.body.querySelectorAll("*"));
    const findHit = (candidates: Element[]) =>
        candidates.find((el) => {
            const text = el.textContent?.replace(/\s+/g, " ").trim() ?? "";
            return Boolean(text) && sentinel.test(text);
        });

    const hit = findHit(preferred) ?? findHit(all);

    if (!hit) return document.body.innerHTML;

    // Find a cut point where removing the node preserves earlier siblings.
    // CoinDesk commonly renders "More For You" as the first child of a promo module;
    // we want to remove that module (and anything after it), not the whole container.
    let cutNode: any = hit;
    while (
        cutNode?.parentElement &&
        String(cutNode.parentElement.tagName ?? "").toUpperCase() !== "BODY" &&
        !cutNode.previousElementSibling
    ) {
        cutNode = cutNode.parentElement;
    }

    let node: any = cutNode;
    while (node) {
        const next: any = node.nextElementSibling;
        node.remove();
        node = next;
    }

    return document.body.innerHTML;
};

const parseBitcoinComArticleFromSlug = async (slug: string): Promise<ParsedArticle> => {
    const apiUrl = new URL("https://api.news.bitcoin.com/wp-json/wp/v2/posts");
    apiUrl.searchParams.set("slug", slug);

    const resp = await fetch(apiUrl.toString(), {
        headers: {
            Accept: "application/json",
            "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        },
        redirect: "follow",
    });

    if (!resp.ok) {
        throw new Error(`Upstream fetch failed: ${resp.status}`);
    }

    const json = (await resp.json()) as unknown;
    if (!Array.isArray(json) || json.length === 0) {
        throw new Error("Upstream post not found");
    }

    const post = json[0] as BitcoinComWpPost;
    const titleHtml = post.title?.rendered ?? "";
    const contentHtml = post.content?.rendered ?? "";

    return {
        title: titleHtml ? stripHtmlToText(titleHtml) : null,
        byline: post.bcn_author?.name ?? null,
        // bitcoin.com's excerpt is typically just the first sentence(s) of the body.
        // We don't want to render that as a separate gray "description" block.
        excerpt: null,
        siteName: post.yoast_head_json?.og_site_name ?? "Bitcoin.com News",
        contentHtml: contentHtml || null,
        textContent: contentHtml ? stripHtmlToText(contentHtml) : null,
    };
};

const isProbablyBlockedHostname = (hostname: string): boolean => {
    const h = hostname.trim().toLowerCase();
    if (!h) return true;
    if (h === "localhost") return true;
    if (h === "0.0.0.0") return true;
    if (h === "127.0.0.1") return true;
    if (h === "::1") return true;
    if (h.endsWith(".local")) return true;
    if (h.endsWith(".internal")) return true;
    return false;
};

export const parseArticleFromUrl = async (rawUrl: string): Promise<ParsedArticle> => {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("Invalid URL protocol");
    }
    if (isProbablyBlockedHostname(url.hostname)) {
        throw new Error("Blocked hostname");
    }

    // bitcoin.com news pages are often a JS app shell, so Readability sees little/no article content.
    // Their WordPress JSON API provides the full HTML body by slug.
    if (url.hostname === "news.bitcoin.com") {
        const slug = getSlugFromPathname(url.pathname);
        if (slug) {
            try {
                return await parseBitcoinComArticleFromSlug(slug);
            } catch {
                // Fall through to generic Readability parsing.
            }
        }
    }

    const resp = await fetch(url.toString(), {
        headers: {
            Accept: "text/html,application/xhtml+xml",
            "User-Agent": "cryptowire/1.0 (+https://cryptowi.re)",
        },
        redirect: "follow",
    });

    if (!resp.ok) {
        throw new Error(`Upstream fetch failed: ${resp.status}`);
    }

    const html = await resp.text();
    const dom = new JSDOM(html, { url: url.toString() });

    const reader = new Readability(dom.window.document);
    const parsed = reader.parse();

    const parsedContentHtml = parsed?.content ?? null;
    const parsedTextContent = parsed?.textContent ?? null;

    // CoinDesk article pages often include a "More For You" recommendations block
    // after the actual article body; Readability sometimes captures it.
    const isCoinDesk = url.hostname === "www.coindesk.com" || url.hostname.endsWith(".coindesk.com");
    const coindeskSentinel = /^more\s+for\s+you$/i;
    const cleanedContentHtml =
        isCoinDesk && parsedContentHtml
            ? truncateDomAtSentinelText(parsedContentHtml, coindeskSentinel)
            : parsedContentHtml;
    const cleanedTextContent =
        isCoinDesk && parsedTextContent
            ? (() => {
                const idx = parsedTextContent.toLowerCase().indexOf("more for you");
                return idx === -1 ? parsedTextContent : parsedTextContent.slice(0, idx).trimEnd();
            })()
            : parsedTextContent;

    return {
        title: parsed?.title ?? null,
        byline: parsed?.byline ?? null,
        excerpt: parsed?.excerpt ?? null,
        siteName: parsed?.siteName ?? null,
        contentHtml: cleanedContentHtml,
        textContent: cleanedTextContent,
    };
};
