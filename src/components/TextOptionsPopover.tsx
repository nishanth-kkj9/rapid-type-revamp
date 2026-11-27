import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  PACE_CARET_OPTIONS,
  STRICT_MODES,
  WORD_LIST_OPTIONS,
  getPaceCaret,
  getStrictMode,
  resolveTextOptions,
  type DrillMode,
  type DrillSettings,
} from "@/lib/drillSettings";

interface TextOptionsPopoverProps {
  settings: DrillSettings;
  drillMode: DrillMode;
  hasCustomText: boolean;
  onUpdateSettings: (patch: Partial<DrillSettings>) => void;
}

export function TextOptionsPopover({
  settings,
  drillMode,
  hasCustomText,
  onUpdateSettings,
}: TextOptionsPopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  const textOpts = resolveTextOptions(settings);
  const strictMode = getStrictMode(settings);
  const paceCaret = getPaceCaret(settings);

  const activeTags: string[] = [];
  if (drillMode !== "quote" && !hasCustomText) {
    activeTags.push(settings.wordList === "1000" ? "1000w" : "200w");
    if (textOpts.numbers) activeTags.push("123");
    if (settings.focusWeakKeys) activeTags.push("focus");
  }
  if (strictMode !== "off") activeTags.push(`strict:${strictMode}`);
  if (paceCaret === "pb") activeTags.push("pace");

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`flex min-h-11 sm:min-h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors ${
          open || strictMode !== "off" || paceCaret === "pb" || settings.focusWeakKeys
            ? "border-primary/50 bg-primary/10 text-foreground"
            : "border-border bg-secondary/70 text-muted-foreground hover:text-foreground"
        }`}
      >
        <SlidersHorizontal className="size-3.5 text-primary" />
        <span>Options</span>
        {activeTags.length > 0 ? (
          <span className="hidden text-[13px] text-muted-foreground sm:inline">
            · {activeTags.join(" · ")}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Test options"
          className="absolute left-0 top-full z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] space-y-3.5 rounded-xl border border-border bg-popover p-3.5 text-left text-[13px] text-popover-foreground sm:left-auto sm:right-0 sm:w-80"
        >
          {drillMode !== "quote" && !hasCustomText ? (
            <>
              <div>
                <div className="mb-1.5 text-[13px] font-medium text-muted-foreground">
                  Word list
                </div>
                <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-secondary/50 p-1">
                  {WORD_LIST_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={settings.wordList === opt.id}
                      onClick={() => onUpdateSettings({ wordList: opt.id })}
                      className={`min-h-11 sm:min-h-8 cursor-pointer rounded-md px-2 py-1 text-[13px] font-medium transition-colors ${
                        settings.wordList === opt.id
                          ? "bg-primary font-semibold text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-[13px] font-medium text-muted-foreground">
                  Modifiers
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    aria-pressed={textOpts.punctuation}
                    onClick={() => onUpdateSettings({ includePunctuation: !textOpts.punctuation })}
                    className={`min-h-11 sm:min-h-8 cursor-pointer rounded-lg border px-2.5 py-1 text-[13px] font-medium transition-colors ${
                      textOpts.punctuation
                        ? "border-accent/60 bg-accent/20 font-semibold text-foreground"
                        : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Punctuation
                  </button>
                  <button
                    type="button"
                    aria-pressed={textOpts.numbers}
                    onClick={() => onUpdateSettings({ includeNumbers: !textOpts.numbers })}
                    className={`min-h-11 sm:min-h-8 cursor-pointer rounded-lg border px-2.5 py-1 text-[13px] font-medium transition-colors ${
                      textOpts.numbers
                        ? "border-accent/60 bg-accent/20 font-semibold text-foreground"
                        : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Numbers
                  </button>
                  <button
                    type="button"
                    aria-pressed={textOpts.capitals}
                    onClick={() => onUpdateSettings({ includeCapitals: !textOpts.capitals })}
                    className={`min-h-11 sm:min-h-8 cursor-pointer rounded-lg border px-2.5 py-1 text-[13px] font-medium transition-colors ${
                      textOpts.capitals
                        ? "border-accent/60 bg-accent/20 font-semibold text-foreground"
                        : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Capitals
                  </button>
                  <button
                    type="button"
                    aria-pressed={settings.focusWeakKeys}
                    onClick={() => onUpdateSettings({ focusWeakKeys: !settings.focusWeakKeys })}
                    className={`min-h-11 sm:min-h-8 cursor-pointer rounded-lg border px-2.5 py-1 text-[13px] font-medium transition-colors ${
                      settings.focusWeakKeys
                        ? "border-primary/60 bg-primary/15 font-semibold text-foreground"
                        : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Focus weak keys
                  </button>
                </div>
              </div>
            </>
          ) : null}

          <div>
            <div className="mb-1.5 text-[13px] font-medium text-muted-foreground">Strict mode</div>
            <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-secondary/50 p-1">
              {STRICT_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  title={m.description}
                  aria-pressed={strictMode === m.id}
                  onClick={() => onUpdateSettings({ strictMode: m.id })}
                  className={`min-h-11 sm:min-h-8 cursor-pointer rounded-md px-2 py-1 text-[13px] font-medium transition-colors ${
                    strictMode === m.id
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-[13px] font-medium text-muted-foreground">Pace caret</div>
            <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-secondary/50 p-1">
              {PACE_CARET_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={paceCaret === opt.id}
                  onClick={() => onUpdateSettings({ paceCaret: opt.id })}
                  className={`min-h-11 sm:min-h-8 cursor-pointer rounded-md px-2 py-1 text-[13px] font-medium transition-colors ${
                    paceCaret === opt.id
                      ? "bg-accent font-semibold text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
