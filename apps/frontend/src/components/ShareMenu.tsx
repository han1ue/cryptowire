import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useMemo } from "react";
import type { ReactNode } from "react";

const SHARE_ATTRIBUTION = "via cryptowire";
const X_MAX_CHARS = 280;
const X_TRUNCATION_SUFFIX = "(...)";

type ShareMenuProps = {
    url: string;
    title?: string;
    text?: string;
    xText?: string;
    xAppendUrl?: boolean;
    children: ReactNode;
    align?: "start" | "center" | "end";
};

const buildShareText = (text?: string) => {
    const trimmed = text?.trim() ?? "";
    if (!trimmed) return SHARE_ATTRIBUTION;
    if (trimmed.toLowerCase().includes(SHARE_ATTRIBUTION)) return trimmed;
    return `${trimmed} ${SHARE_ATTRIBUTION}`;
};

const truncateForX = (text: string) => {
    if (text.length <= X_MAX_CHARS) return text;
    const maxWithoutSuffix = X_MAX_CHARS - X_TRUNCATION_SUFFIX.length;
    if (maxWithoutSuffix <= 0) return X_TRUNCATION_SUFFIX.slice(0, X_MAX_CHARS);
    return `${text.slice(0, maxWithoutSuffix).trimEnd()}${X_TRUNCATION_SUFFIX}`;
};

const openNewWindow = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
};

const stripQueryParams = (rawUrl: string) => {
    try {
        const parsed = new URL(rawUrl);
        parsed.search = "";
        return parsed.toString();
    } catch {
        const qIndex = rawUrl.indexOf("?");
        return qIndex === -1 ? rawUrl : rawUrl.slice(0, qIndex);
    }
};

export const ShareMenu = ({
    url,
    title,
    text,
    xText,
    xAppendUrl = true,
    children,
    align = "end",
}: ShareMenuProps) => {
    const strippedUrl = useMemo(() => stripQueryParams(url), [url]);
    const encodedUrl = useMemo(() => encodeURIComponent(strippedUrl), [strippedUrl]);
    const shareText = useMemo(() => buildShareText(text ?? title), [text, title]);
    const xShareBaseText = useMemo(() => buildShareText(xText ?? text ?? title), [xText, text, title]);
    const xShareText = useMemo(() => encodeURIComponent(truncateForX(xShareBaseText)), [xShareBaseText]);
    const encodedShareText = useMemo(() => encodeURIComponent(shareText), [shareText]);

    const xShareUrl = `https://twitter.com/intent/tweet?text=${xShareText}${xAppendUrl ? `&url=${encodedUrl}` : ""}`;
    const telegramShareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedShareText}`;
    const redditShareUrl = `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedShareText}`;

    const copyLink = async () => {
        await navigator.clipboard.writeText(strippedUrl);
        window.dispatchEvent(new CustomEvent("show-toast", { detail: { message: "Link copied to clipboard" } }));
    };

    const nativeShare = async () => {
        await navigator.share({
            title,
            text: shareText,
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
                        openNewWindow(telegramShareUrl);
                    }}
                >
                    Share on Telegram
                </DropdownMenuItem>
                <DropdownMenuItem
                    onSelect={() => {
                        openNewWindow(redditShareUrl);
                    }}
                >
                    Share on Reddit
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
