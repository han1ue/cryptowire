import { Newspaper, Activity, Settings, Bell, Menu } from "lucide-react";
import { useState, useEffect, useRef } from "react";

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
}

export const Header = ({
  onSettingsClick,
  notifications = [],
  onNotificationsViewed = () => { },
  onMenuClick = () => { },
}: HeaderProps) => {
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

  const closeNotifications = () => {
    setNotificationsOpen(open => {
      if (open && hasUnread) {
        onNotificationsViewed();
      }
      return false;
    });
  };

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
  }, [notificationsOpen, hasUnread]);

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
            <span className="text-lg font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
              CRYPTO<span className="text-primary">WI</span>
              <span className="text-primary">.</span>
              <span className="text-primary">RE</span>
            </span>
          </a>
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-muted/50 rounded">
            <Activity className="h-3 w-3 text-terminal-green pulse-glow" />
            <span className="text-[10px] text-terminal-green uppercase">Connected</span>
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
