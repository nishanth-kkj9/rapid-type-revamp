import { KEYBOARD_ROWS, KEY_WIDTHS, keyFor } from "@/lib/keyboardLayout";

interface Props {
  nextChar: string | null;
  errorFlash: boolean;
  pressedChar?: string | null;
}

/** Compact symbols for narrow screens where full labels can't fit. */
const SHORT_LABELS: Record<string, string> = {
  Backspace: "⌫",
  Tab: "⇥",
  Caps: "⇪",
  Enter: "⏎",
  Shift: "⇧",
};

export function Keyboard({ nextChar, errorFlash, pressedChar }: Props) {
  const { key: target, shift } = keyFor(nextChar);
  const { key: pressed } = keyFor(pressedChar ?? null);

  return (
    <div className="panel select-none space-y-1 p-2 sm:space-y-1.5 sm:p-4" aria-hidden="true">
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1 sm:gap-1.5">
          {row.map((k) => {
            const isShift = k === "Shift-L" || k === "Shift-R";
            const isTarget = k === target || (shift && isShift);
            const displayLabel = isShift ? "Shift" : k === "Space" ? "" : k;
            const shortLabel = SHORT_LABELS[displayLabel];
            return (
              <div
                key={`${rowIndex}-${k}`}
                data-state={
                  isTarget
                    ? errorFlash
                      ? "error"
                      : "active"
                    : k === pressed
                      ? "pressed"
                      : undefined
                }
                className={`keycap flex h-8 min-w-0 items-center justify-center px-0.5 font-mono text-[10px] uppercase sm:h-11 sm:px-1 sm:text-xs ${
                  KEY_WIDTHS[k] ?? "flex-1"
                }`}
              >
                {shortLabel ? (
                  <>
                    <span className="sm:hidden">{shortLabel}</span>
                    <span className="hidden truncate sm:inline">{displayLabel}</span>
                  </>
                ) : (
                  <span className="truncate">{displayLabel}</span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
