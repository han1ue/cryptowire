import { Activity, Settings, Bell, Menu } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
};

interface HeaderProps {
  onSettingsClick?: () => void;
  notifications?: NotificationItem[];
  onNotificationsViewed?: () => void;
  onMenuClick?: () => void;
  lastRefreshAt?: string | null;
}

export const Header = ({
  onSettingsClick,
  notifications = [],
  onNotificationsViewed = () => { },
  onMenuClick = () => { },
  lastRefreshAt = null,
}: HeaderProps) => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator === "undefined") return true;
    return navigator.onLine;
  });
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  );

  const [currentDate, setCurrentDate] = useState(
    new Date().toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  );
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const hasUnread = notifications.some(notification => !notification.read);
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const [hoverCapable, setHoverCapable] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches ?? false;
  });

  const formatAgeShort = (iso: string): string => {
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return "";
    const diffMs = Date.now() - t;
    if (diffMs < 0) return "0m";
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return "<1m";
    if (diffMin < 60) return `${diffMin}m`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d`;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setCurrentDate(
        now.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const close = () => setStatusOpen(false);
    const onVisibility = () => {
      if (document.hidden) close();
    };

    window.addEventListener("blur", close);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", close);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!statusOpen) return;
    if (typeof window === "undefined") return;

    // Mobile / touch behavior: tap outside or scroll closes.
    if (hoverCapable) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (statusRef.current && statusRef.current.contains(target)) return;
      setStatusOpen(false);
    };

    const onScroll = () => setStatusOpen(false);

    document.addEventListener("mousedown", onPointerDown, true);
    document.addEventListener("touchstart", onPointerDown, true);
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onPointerDown, true);
      document.removeEventListener("touchstart", onPointerDown, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [statusOpen, hoverCapable]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia?.("(hover: hover) and (pointer: fine)");
    if (!media) return;

    const onChange = () => setHoverCapable(media.matches);
    onChange();
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const closeNotifications = useCallback(() => {
    setNotificationsOpen(open => {
      if (open && hasUnread) {
        onNotificationsViewed();
      }
      return false;
    });
  }, [hasUnread, onNotificationsViewed]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationsOpen &&
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        closeNotifications();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notificationsOpen, closeNotifications]);

  const handleToggleNotifications = () => {
    setNotificationsOpen(open => {
      if (open) {
        if (hasUnread) {
          onNotificationsViewed();
        }
        return false;
      }
      return true;
    });
  };

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden p-2 hover:bg-muted rounded transition-colors"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5 text-muted-foreground" />
          </button>
          <a href="/" className="flex items-center gap-2 group cursor-pointer select-none">
            <img
              src="/favicon.svg"
              alt=""
              aria-hidden="true"
              className="h-5 w-5"
            />
            <span className="text-lg font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
              CRYPTO<span className="text-primary">WI</span>
              <span className="text-primary">.</span>
              <span className="text-primary">RE</span>
            </span>
          </a>

          <div
            ref={statusRef}
            className="relative"
            onMouseEnter={() => {
              if (hoverCapable) setStatusOpen(true);
            }}
            onMouseLeave={() => {
              if (hoverCapable) setStatusOpen(false);
            }}
          >
            <button
              type="button"
              className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded"
              aria-label="Connection status"
              aria-expanded={statusOpen}
              onClick={() => {
                if (!hoverCapable) setStatusOpen((v) => !v);
              }}
              onFocus={() => {
                // Desktop should open only on hover, not focus.
                if (!hoverCapable) setStatusOpen(true);
              }}
              onBlur={() => setStatusOpen(false)}
            >
              <Activity className={`h-3 w-3 ${isOnline ? "text-terminal-green pulse-glow" : "text-terminal-red"}`} />
              <span
                className={`hidden sm:inline text-[10px] uppercase ${isOnline ? "text-terminal-green" : "text-terminal-red"}`}
              >
                {isOnline ? "Connected" : "Disconnected"}
              </span>
            </button>

            {statusOpen ? (
              <div className="absolute top-full mt-2 w-56 max-w-[calc(100vw-1rem)] rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-md z-50 right-0 sm:left-0 sm:right-auto">
                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Status</div>
                  <div className="text-xs text-foreground">{isOnline ? "Connected" : "Disconnected"}</div>
                  {isOnline ? (
                    <div className="text-[11px] text-muted-foreground">
                      {lastRefreshAt ? `Updated ${formatAgeShort(lastRefreshAt)} ago` : "Updated —"}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Center - Navigation */}
        {/*
        <nav className="hidden md:flex items-center gap-1">
          {["Markets", "News", "Analysis", "Data"].map((item, i) => (
            <button
              key={item}
              className={`px-3 py-1.5 text-xs uppercase tracking-wider transition-colors ${i === 1
                  ? "text-primary bg-primary/10 border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
            >
              {item}
            </button>
          ))}
        </nav>
        */}

        {/* Right - Time & Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-medium text-foreground tabular-nums">
              {currentTime}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {currentDate}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative" ref={notificationsRef}>
              <button
                className="p-2 hover:bg-muted rounded transition-colors relative"
                onClick={handleToggleNotifications}
              >
                <Bell className="h-4 w-4 text-muted-foreground" />
                {hasUnread && (
                  <span className="absolute top-1 right-1 h-2 w-2 bg-terminal-amber rounded-full" />
                )}
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-card border border-border rounded shadow-xl p-3 text-left z-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Notifications
                    </span>
                    {hasUnread && (
                      <span className="text-[10px] text-terminal-amber">
                        {notifications.filter(notification => !notification.read).length} new
                      </span>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No notifications yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {notifications.map(notification => (
                        <div
                          key={notification.id}
                          className={`border border-border/60 rounded p-2 bg-muted/20 ${notification.read ? "opacity-70" : ""
                            }`}
                        >
                          <p className="text-xs font-semibold text-foreground">
                            {notification.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                            <span>{notification.time}</span>
                            <span className={notification.read ? "text-terminal-green" : "text-primary"}>
                              {notification.read ? "Viewed" : "New"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              className="p-2 hover:bg-muted rounded transition-colors"
              onClick={onSettingsClick}
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
