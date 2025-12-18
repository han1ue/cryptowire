import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useMemo } from "react";
import type { ReactNode } from "react";

type ShareMenuProps = {
    url: string;
    title?: string;
    children: ReactNode;
    align?: "start" | "center" | "end";
};

const buildShareText = (title?: string) => {
    const base = "via cryptowi.re";
    if (!title) return base;
    return `${title} ${base}`;
};

const openNewWindow = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
};

export const ShareMenu = ({ url, title, children, align = "end" }: ShareMenuProps) => {
    const encodedUrl = useMemo(() => encodeURIComponent(url), [url]);
    const encodedTitle = useMemo(() => encodeURIComponent(buildShareText(title)), [title]);

    const xShareUrl = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
    const redditShareUrl = `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`;
    const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;

    const copyLink = async () => {
        await navigator.clipboard.writeText(url);
        window.dispatchEvent(new CustomEvent("show-toast", { detail: { message: "Link copied to clipboard" } }));
    };

    const nativeShare = async () => {
        await navigator.share({
            title,
            text: buildShareText(title),
            url,
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
