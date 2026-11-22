import { useMemo, useState } from "react";
import { AlertTriangle, Check, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MAX_CUSTOM_TEXT_CHARS,
  normalizeCustomText,
  type CustomTextEntry,
} from "@/lib/customTexts";

interface CustomTextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customTexts: CustomTextEntry[];
  activeCustomTextId: string | null;
  onSaveCustomText: (input: {
    id?: string;
    name: string;
    text: string;
    activate?: boolean;
  }) => CustomTextEntry | null;
  onDeleteCustomText: (id: string) => void;
  onSelectCustomText: (id: string | null) => void;
}

export function CustomTextDialog({
  open,
  onOpenChange,
  customTexts,
  activeCustomTextId,
  onSaveCustomText,
  onDeleteCustomText,
  onSelectCustomText,
}: CustomTextDialogProps) {
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [name, setName] = useState("");
  const [rawText, setRawText] = useState("");

  const normalized = useMemo(() => normalizeCustomText(rawText), [rawText]);

  const startNew = () => {
    setEditingId(undefined);
    setName("");
    setRawText("");
  };

  const startEdit = (entry: CustomTextEntry) => {
    setEditingId(entry.id);
    setName(entry.name);
    setRawText(entry.text);
  };

  const handleSave = (activate: boolean) => {
    if (!normalized.text) return;
    const saved = onSaveCustomText({
      ...(editingId ? { id: editingId } : {}),
      name: name.trim() || "Custom Passage",
      text: rawText,
      activate,
    });
    if (saved) {
      startNew();
      if (activate) onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border-border bg-card p-6 text-foreground">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">Custom Practice Text</DialogTitle>
              <DialogDescription className="text-[13px] text-muted-foreground">
                Paste code, study notes, or prose (up to {MAX_CUSTOM_TEXT_CHARS.toLocaleString()}{" "}
                chars) and practice in Time, Words, or Quote style.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {customTexts.length > 0 ? (
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-muted-foreground">
                Saved lists ({customTexts.length})
              </span>
              {activeCustomTextId ? (
                <button
                  type="button"
                  onClick={() => {
                    onSelectCustomText(null);
                    onOpenChange(false);
                  }}
                  className="cursor-pointer text-[13px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Use standard generator instead
                </button>
              ) : null}
            </div>
            <ul className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
              {customTexts.map((entry) => {
                const isActive = entry.id === activeCustomTextId;
                return (
                  <li
                    key={entry.id}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-[13px] ${
                      isActive ? "border-primary bg-primary/10" : "border-border bg-secondary/40"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-foreground">{entry.name}</div>
                      <div className="truncate text-[13px] text-muted-foreground">
                        {entry.text.length.toLocaleString()} chars · {entry.text}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCustomText(isActive ? null : entry.id);
                          onOpenChange(false);
                        }}
                        className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-foreground hover:bg-primary/20"
                        }`}
                      >
                        {isActive ? (
                          <>
                            <Check className="size-3" />
                            Active
                          </>
                        ) : (
                          "Practice"
                        )}
                      </button>
                      <button
                        type="button"
                        aria-label={`Edit ${entry.name}`}
                        onClick={() => startEdit(entry)}
                        className="cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${entry.name}`}
                        onClick={() => {
                          onDeleteCustomText(entry.id);
                          if (editingId === entry.id) startNew();
                        }}
                        className="cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <div className="mt-3 space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-muted-foreground">
              {editingId ? "Edit list" : "Create new list"}
            </span>
            {editingId ? (
              <button
                type="button"
                onClick={startNew}
                className="inline-flex cursor-pointer items-center gap-1 text-[13px] text-primary hover:underline"
              >
                <Plus className="size-3" /> New list
              </button>
            ) : null}
          </div>

          <input
            type="text"
            aria-label="Custom list name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="List name (e.g. TypeScript Snippets, Study Notes)"
            className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />

          <div>
            <textarea
              aria-label="Custom practice passage text"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={5}
              placeholder="Paste or type your practice text here..."
              className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 font-mono text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="mt-1 flex items-center justify-between text-[13px] text-muted-foreground">
              <span>Normalized to typeable ASCII</span>
              <span className="font-mono tabular-nums">
                {normalized.text.length.toLocaleString()} / {MAX_CUSTOM_TEXT_CHARS.toLocaleString()}
              </span>
            </div>
          </div>

          {normalized.warnings.length > 0 ? (
            <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-[13px] text-foreground">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <div className="space-y-0.5">
                {normalized.warnings.map((w) => (
                  <p key={w}>{w}</p>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={!normalized.text}
              onClick={() => handleSave(false)}
              className="cursor-pointer rounded-lg border border-border bg-secondary px-4 py-2 text-[13px] font-semibold text-foreground transition-colors hover:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {editingId ? "Update List" : "Save List"}
            </button>
            <button
              type="button"
              disabled={!normalized.text}
              onClick={() => handleSave(true)}
              className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {editingId ? "Update & Practice" : "Save & Practice"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
