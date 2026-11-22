import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteAllDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDeleteAll: () => void;
}

export function DeleteAllDataDialog({
  open,
  onOpenChange,
  onConfirmDeleteAll,
}: DeleteAllDataDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const canDelete = confirmText.trim() === "DELETE";

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) setConfirmText("");
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="border-destructive/40 bg-card text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-destructive">
            <AlertTriangle className="size-5" />
            Delete all local data
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed text-muted-foreground">
            This permanently erases your drill &amp; shooter history, key accuracy/speed stats,
            achievements, daily goal streak, missed words, custom texts, and preferences stored in
            this browser. Export a full backup first if you may want them back.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label
            htmlFor="delete-all-confirm"
            className="block text-[13px] font-medium text-foreground"
          >
            Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm:
          </label>
          <input
            id="delete-all-confirm"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            autoComplete="off"
            data-lpignore="true"
            className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-destructive"
          />
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => handleClose(false)}
            className="cursor-pointer rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canDelete}
            onClick={() => {
              onConfirmDeleteAll();
              setConfirmText("");
              onOpenChange(false);
            }}
            className="cursor-pointer rounded-lg bg-destructive px-4 py-2 text-[13px] font-semibold text-destructive-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Delete all my data
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
