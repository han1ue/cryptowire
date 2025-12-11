import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Newspaper, LayoutList, Sun, Moon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { sources } from "@/data/mockNews";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSources: string[];
  onSelectedSourcesChange: (sources: string[]) => void;
  lineView: boolean;
  onLineViewChange: (lineView: boolean) => void;
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
}

export const SettingsDialog = ({
  open,
  onOpenChange,
  selectedSources,
  onSelectedSourcesChange,
  lineView,
  onLineViewChange,
  theme,
  onThemeChange,
}: SettingsDialogProps) => {
  const handleSourceToggle = (sourceName: string, checked: boolean) => {
    if (checked) {
      onSelectedSourcesChange([...selectedSources, sourceName]);
    } else {
      onSelectedSourcesChange(selectedSources.filter(s => s !== sourceName));
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
                onClick={() => onLineViewChange(true)}
                className={`flex-1 px-3 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${lineView
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
              >
                Line
              </button>
              <button
                onClick={() => onLineViewChange(false)}
                className={`flex-1 px-3 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${!lineView
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
            <div className="space-y-4">
              {sources.map((source) => {
                const isChecked = selectedSources.includes(source.name);
                return (
                  <label
                    key={source.name}
                    className="flex items-center justify-between cursor-pointer"
                    onClick={(event) => {
                      if ((event.target as HTMLElement).closest('[role="switch"]')) return;
                      handleSourceToggle(source.name, !isChecked);
                    }}
                  >
                    <span className="text-xs text-foreground">
                      {source.name}
                    </span>
                    <Switch
                      checked={isChecked}
                      onCheckedChange={(checked) => handleSourceToggle(source.name, checked)}
                      aria-label={`Toggle ${source.name}`}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};