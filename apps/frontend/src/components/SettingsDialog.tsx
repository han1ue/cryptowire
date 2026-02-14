import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LayoutList, Sun, Moon, Wrench } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayMode: "compact" | "line" | "cards";
  onDisplayModeChange: (mode: "compact" | "line" | "cards") => void;
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
  onClearLocalStorage?: () => void;
}

export const SettingsDialog = ({
  open,
  onOpenChange,
  displayMode,
  onDisplayModeChange,
  theme,
  onThemeChange,
  onClearLocalStorage = () => { },
}: SettingsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-8">
        <DialogHeader>
          <DialogTitle className="mb-4 text-center">Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Theme */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {theme === "dark" ? (
                  <Moon className="h-4 w-4 text-primary" />
                ) : (
                  <Sun className="h-4 w-4 text-primary" />
                )}
                <span className="text-xs font-medium uppercase tracking-wider text-foreground">
                  Theme
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>Light</span>
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={(checked) => onThemeChange(checked ? "dark" : "light")}
                  aria-label="Toggle dark mode"
                />
                <span>Dark</span>
              </div>
            </div>
          </div>

          {/* Display Mode */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <LayoutList className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium uppercase tracking-wider text-foreground">
                Display Mode
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onDisplayModeChange("compact")}
                className={`flex-1 px-3 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${displayMode === "compact"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
              >
                Compact
              </button>
              <button
                onClick={() => onDisplayModeChange("line")}
                className={`flex-1 px-3 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${displayMode === "line"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
              >
                Line
              </button>
              <button
                onClick={() => onDisplayModeChange("cards")}
                className={`flex-1 px-3 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${displayMode === "cards"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
              >
                Cards
              </button>
            </div>
          </div>

          {/* Dev */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium uppercase tracking-wider text-foreground">
                Dev
              </span>
            </div>
            <button
              type="button"
              onClick={onClearLocalStorage}
              className="w-full text-left px-3 py-2 text-xs font-medium uppercase tracking-wider bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear local storage
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
