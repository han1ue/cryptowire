import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Newspaper } from "lucide-react";
import { SourceId, SourceName } from "@/data/sources";

interface SourcesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableSources: ReadonlyArray<{ id: SourceId; name: SourceName; icon?: string }>;
  selectedSources: SourceId[];
  onSelectedSourcesChange: (sources: SourceId[]) => void;
}

export const SourcesDialog = ({
  open,
  onOpenChange,
  availableSources,
  selectedSources,
  onSelectedSourcesChange,
}: SourcesDialogProps) => {
  const allSelected = availableSources.length > 0 && selectedSources.length === availableSources.length;
  const noneSelected = selectedSources.length === 0;

  const toggleSource = (sourceId: SourceId) => {
    const isSelected = selectedSources.includes(sourceId);
    if (isSelected) {
      onSelectedSourcesChange(selectedSources.filter((s) => s !== sourceId));
      return;
    }
    onSelectedSourcesChange([...selectedSources, sourceId]);
  };

  const selectAllSources = () => {
    onSelectedSourcesChange(availableSources.map((source) => source.id));
  };

  const clearSources = () => {
    onSelectedSourcesChange([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-8 pt-12">
        <DialogHeader className="sr-only">
          <DialogTitle>Sources</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between pr-14 sm:pr-12">
            <div className="flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium uppercase tracking-wider text-foreground">
                Source Selection
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {selectedSources.length}/{availableSources.length} active
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={selectAllSources}
              disabled={allSelected}
              className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors border border-border text-foreground bg-background hover:bg-muted/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={clearSources}
              disabled={noneSelected}
              className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors border border-border text-foreground bg-background hover:bg-muted/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
            <div className="grid grid-cols-2 gap-2">
              {availableSources.map((source) => {
                const isSelected = selectedSources.includes(source.id);
                return (
                  <button
                    key={source.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleSource(source.id)}
                    className={`px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider transition-colors ${isSelected
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
