import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

type SeoProps = {
    title: string;
    description?: string;
    canonicalPath?: string;
    noIndex?: boolean;
    jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
};

const normalizeSiteUrl = (raw: string) => raw.replace(/\/+$/, "");

const getSiteUrl = (): string => {
    const env = import.meta.env.VITE_SITE_URL;
    if (typeof env === "string" && env.startsWith("http")) return normalizeSiteUrl(env);
    if (typeof window !== "undefined" && window.location?.origin) return normalizeSiteUrl(window.location.origin);
    return "https://cryptowi.re";
};

const normalizeCanonicalPath = (raw: string) => {
    if (!raw) return "/";
    if (raw === "/") return "/";
    return raw.replace(/\/+$/, "");
};

export const Seo = ({ title, description, canonicalPath, noIndex, jsonLd }: SeoProps) => {
    const location = useLocation();
    const siteUrl = getSiteUrl();
    const path = normalizeCanonicalPath(canonicalPath ?? location.pathname);
    const canonicalUrl = siteUrl + path;

    const ldArray = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];

    return (
        <Helmet>
            <title>{title}</title>
            {description ? <meta name="description" content={description} /> : null}

            <link rel="canonical" href={canonicalUrl} />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:title" content={title} />
            {description ? <meta property="og:description" content={description} /> : null}
            <meta property="og:type" content="website" />
            <meta property="og:site_name" content="cryptowi.re" />

            <meta
                name="robots"
                content={
                    noIndex
                        ? "noindex,nofollow"
                        : "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"
                }
            />

            <link rel="alternate" type="application/rss+xml" title="cryptowi.re RSS" href={`${siteUrl}/rss.xml`} />

            {ldArray.map((obj, idx) => (
                <script key={idx} type="application/ld+json">
                    {JSON.stringify(obj)}
                </script>
            ))}
        </Helmet>
    );
};
