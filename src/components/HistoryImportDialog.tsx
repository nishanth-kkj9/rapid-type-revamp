import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface HistoryImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function HistoryImportDialog({
  open,
  onOpenChange,
  value,
  onChange,
  onSubmit,
}: HistoryImportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-lg font-bold">Import History JSON</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Paste exported history JSON text below to merge runs into your local history.
          </DialogDescription>
        </DialogHeader>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder='{"entries": [...]}'
          rows={6}
          className="w-full rounded-lg border border-border bg-secondary/50 p-3 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!value.trim()}
            className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Merge History
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
