import {
  getKeyboardRows,
  keyFor,
  type FingerZone,
  type KeyboardLayoutId,
  type KeyboardStandard,
} from "@/lib/keyboardLayout";

interface Props {
  nextChar: string | null;
  errorFlash: boolean;
  pressedChar?: string | null;
  layout?: KeyboardLayoutId | undefined;
  standard?: KeyboardStandard | undefined;
  showFingerZones?: boolean | undefined;
  lockedKeys?: ReadonlySet<string> | undefined;
  focusKey?: string | null | undefined;
}

const SHORT_LABELS: Record<string, string> = {
  Backspace: "⌫",
  Tab: "⇥",
  Caps: "⇪",
  Enter: "⏎",
  Shift: "⇧",
};

const FINGER_LABELS: Record<FingerZone, string> = {
  "l-pinky": "Left pinky",
  "l-ring": "Left ring",
  "l-middle": "Left middle",
  "l-index": "Left index",
  "r-index": "Right index",
  "r-middle": "Right middle",
  "r-ring": "Right ring",
  "r-pinky": "Right pinky",
  thumb: "Thumb",
};

export function Keyboard({
  nextChar,
  errorFlash,
  pressedChar,
  layout = "qwerty",
  standard = "ansi",
  showFingerZones = true,
  lockedKeys,
  focusKey = null,
}: Props) {
  const rows = getKeyboardRows(layout, standard);
  const targetLookup = keyFor(nextChar, layout, standard);
  const pressedLookup = keyFor(pressedChar ?? null, layout, standard);

  return (
    <>
      <span aria-live="polite" aria-atomic="true" className="sr-only">
        {nextChar
          ? `Next key: ${nextChar === " " ? "space" : nextChar}${targetLookup.shift ? ", with shift" : ""}`
          : ""}
      </span>
      <div className="panel select-none space-y-1 p-2 sm:space-y-1.5 sm:p-4" aria-hidden="true">
        {nextChar &&
        (targetLookup.unmapped ||
          targetLookup.altGr ||
          (showFingerZones && targetLookup.finger)) ? (
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2 px-1 text-[13px] text-muted-foreground">
            {targetLookup.unmapped ? (
              <span className="rounded bg-accent/15 px-2 py-0.5 font-semibold text-foreground">
                Not on {layout.toUpperCase()} layout: &ldquo;{nextChar}&rdquo;
              </span>
            ) : (
              <span>
                {showFingerZones && targetLookup.finger
                  ? FINGER_LABELS[targetLookup.finger]
                  : layout.toUpperCase()}
                {targetLookup.shift ? " · +Shift" : ""}
                {targetLookup.altGr ? " · +AltGr" : ""}
              </span>
            )}
            <span className="text-[13px]">
              {layout.toUpperCase()} · {standard.toUpperCase()}
            </span>
          </div>
        ) : null}

        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-1 sm:gap-1.5">
            {row.map((cell) => {
              const isShiftKey = cell.id === "Shift-L" || cell.id === "Shift-R";
              const isTarget = cell.id === targetLookup.keyId || (targetLookup.shift && isShiftKey);
              const isPressed = !isTarget && cell.id === pressedLookup.keyId;
              const baseLower = cell.base.toLowerCase();
              const isAlpha = !cell.isModifier && /^[a-z]$/.test(baseLower);
              const isLocked = Boolean(isAlpha && lockedKeys?.has(baseLower));
              const isFocus = Boolean(isAlpha && focusKey && baseLower === focusKey.toLowerCase());
              const learnState = isLocked ? "locked" : isFocus ? "focus" : undefined;
              const rawLabel = cell.id === "Space" ? "" : cell.id === "EnterTop" ? "⏎" : cell.base;
              const displayLabel = rawLabel.length === 1 ? rawLabel.toUpperCase() : rawLabel;
              const shortLabel = SHORT_LABELS[rawLabel];

              return (
                <div
                  key={`${rowIndex}-${cell.id}`}
                  data-state={
                    isTarget ? (errorFlash ? "error" : "active") : isPressed ? "pressed" : undefined
                  }
                  data-finger={showFingerZones && !cell.isModifier ? cell.finger : undefined}
                  data-home={cell.home ? "true" : undefined}
                  data-learn={learnState}
                  className={`keycap relative flex h-9 min-w-0 items-center justify-center px-0.5 font-mono text-[13px] sm:h-12 sm:px-1 ${
                    cell.width ?? "flex-1"
                  }`}
                >
                  {cell.shift && !cell.isModifier ? (
                    <div className="flex flex-col items-center leading-none">
                      <span className="hidden text-[13px] opacity-60 sm:inline">{cell.shift}</span>
                      <span>{displayLabel}</span>
                    </div>
                  ) : shortLabel ? (
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
    </>
  );
}
