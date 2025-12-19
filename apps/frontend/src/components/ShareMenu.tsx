import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useMemo } from "react";
import type { ReactNode } from "react";

type ShareMenuProps = {
    url: string;
    title?: string;
    children: ReactNode;
    align?: "start" | "center" | "end";
};

const buildShareText = (title?: string, platform?: string) => {
    const base = platform === 'x' ? "(via @cryptowi_re)" : "(via cryptowi.re)";
    if (!title) return base;
    return `${title} ${base}`;
};

const openNewWindow = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
};

const stripQueryParams = (rawUrl: string) => {
    const trimmedUrl = rawUrl.trim();
    try {
        const parsed = new URL(trimmedUrl);
        parsed.search = "";
        return parsed.toString();
    } catch {
        const qIndex = trimmedUrl.indexOf("?");
        return qIndex === -1 ? trimmedUrl : trimmedUrl.slice(0, qIndex);
    }
};

export const ShareMenu = ({ url, title, children, align = "end" }: ShareMenuProps) => {
    const strippedUrl = useMemo(() => stripQueryParams(url), [url]);
    const encodedUrl = useMemo(() => encodeURIComponent(strippedUrl), [strippedUrl]);
    const xShareText = useMemo(() => encodeURIComponent(buildShareText(title, 'x')), [title]);
    const redditShareText = useMemo(() => encodeURIComponent(buildShareText(title, 'reddit')), [title]);

    const xShareUrl = `https://twitter.com/intent/tweet?text=${xShareText}&url=${encodedUrl}`;
    const redditShareUrl = `https://www.reddit.com/submit?url=${encodedUrl}&title=${redditShareText}`;
    const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;

    const copyLink = async () => {
        await navigator.clipboard.writeText(strippedUrl);
        window.dispatchEvent(new CustomEvent("show-toast", { detail: { message: "Link copied to clipboard" } }));
    };

    const nativeShare = async () => {
        await navigator.share({
            title,
            text: buildShareText(title, 'native'),
            url: strippedUrl,
        });
    };

    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
            <DropdownMenuContent align={align} onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                    onSelect={async () => {
                        try {
                            await copyLink();
                        } catch {
                            // ignore
                        }
                    }}
                >
                    Copy link
                </DropdownMenuItem>

                {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
                    <DropdownMenuItem
                        onSelect={async () => {
                            try {
                                await nativeShare();
                            } catch {
                                // ignore
                            }
                        }}
                    >
                        Share…
                    </DropdownMenuItem>
                ) : null}

                <DropdownMenuItem
                    onSelect={() => {
                        openNewWindow(xShareUrl);
                    }}
                >
                    Share on X
                </DropdownMenuItem>
                <DropdownMenuItem
                    onSelect={() => {
                        openNewWindow(redditShareUrl);
                    }}
                >
                    Share on Reddit
                </DropdownMenuItem>
                <DropdownMenuItem
                    onSelect={() => {
                        openNewWindow(facebookShareUrl);
                    }}
                >
                    Share on Facebook
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
