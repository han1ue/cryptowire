import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Newspaper, LayoutList, Sun, Moon } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableSources: { id: string; name: string }[];
  selectedSources: string[]; // source ids
  onSelectedSourcesChange: (sources: string[]) => void; // source ids
  displayMode: "compact" | "line" | "cards";
  onDisplayModeChange: (mode: "compact" | "line" | "cards") => void;
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
}

export const SettingsDialog = ({
  open,
  onOpenChange,
  availableSources,
  selectedSources,
  onSelectedSourcesChange,
  displayMode,
  onDisplayModeChange,
  theme,
  onThemeChange,
}: SettingsDialogProps) => {
  const toggleSource = (sourceId: string) => {
    const isSelected = selectedSources.includes(sourceId);
    if (isSelected) {
      onSelectedSourcesChange(selectedSources.filter((s) => s !== sourceId));
    } else {
      onSelectedSourcesChange([...selectedSources, sourceId]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-8">
        <DialogHeader>
          <DialogTitle className="mb-4">Settings</DialogTitle>
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

          {/* Sources */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Newspaper className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium uppercase tracking-wider text-foreground">
                Sources
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {availableSources.map((source) => {
                const isSelected = selectedSources.includes(source.id);
                return (
                  <button
                    key={source.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleSource(source.id)}
                    className={`px-3 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {source.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};