import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Newspaper, LayoutList } from "lucide-react";
import { sources } from "@/data/mockNews";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSources: string[];
  onSelectedSourcesChange: (sources: string[]) => void;
  lineView: boolean;
  onLineViewChange: (lineView: boolean) => void;
}

export const SettingsDialog = ({
  open,
  onOpenChange,
  selectedSources,
  onSelectedSourcesChange,
  lineView,
  onLineViewChange,
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
              {sources.map((source) => (
                <label
                  key={source.name}
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => handleSourceToggle(source.name, !selectedSources.includes(source.name))}
                >
                  <span className="text-xs text-foreground">
                    {source.name}
                  </span>
                  <div
                    className={`w-8 h-4 rounded-full transition-colors ${selectedSources.includes(source.name) ? "bg-primary" : "bg-muted"
                      }`}
                  >
                    <div
                      className={`w-3 h-3 rounded-full bg-background transition-transform mt-0.5 ${selectedSources.includes(source.name) ? "translate-x-4.5 ml-0.5" : "translate-x-0.5"
                        }`}
                    />
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};