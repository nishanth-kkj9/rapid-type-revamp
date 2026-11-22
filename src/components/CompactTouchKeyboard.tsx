import {
  getKeyboardRows,
  keyFor,
  type FingerZone,
  type KeyboardLayoutId,
  type KeyboardStandard,
} from "@/lib/keyboardLayout";

interface CompactTouchKeyboardProps {
  nextChar: string | null;
  errorFlash: boolean;
  layout?: KeyboardLayoutId | undefined;
  standard?: KeyboardStandard | undefined;
  showFingerZones?: boolean | undefined;
  lockedKeys?: ReadonlySet<string> | undefined;
  focusKey?: string | null | undefined;
}

const FINGER_SHORT: Record<FingerZone, string> = {
  "l-pinky": "L5",
  "l-ring": "L4",
  "l-middle": "L3",
  "l-index": "L2",
  "r-index": "R2",
  "r-middle": "R3",
  "r-ring": "R4",
  "r-pinky": "R5",
  thumb: "Thumb",
};

/**
 * Compact 3-row alpha guide for touch/coarse-pointer devices so the passage stays visible above the OS keyboard.
 */
export function CompactTouchKeyboard({
  nextChar,
  errorFlash,
  layout = "qwerty",
  standard = "ansi",
  showFingerZones = true,
  lockedKeys,
  focusKey = null,
}: CompactTouchKeyboardProps) {
  const rows = getKeyboardRows(layout, standard).slice(1, 4);
  const lookup = keyFor(nextChar, layout, standard);

  return (
    <div
      className="panel select-none space-y-1 p-2"
      aria-hidden="true"
      data-testid="compact-touch-keyboard"
    >
      <div className="flex min-h-6 items-center justify-between gap-2 px-1 text-[13px] text-muted-foreground">
        {lookup.unmapped && nextChar ? (
          <span className="rounded bg-accent/15 px-1.5 py-0.5 font-semibold text-foreground">
            Not on {layout.toUpperCase()}: &ldquo;{nextChar}&rdquo;
          </span>
        ) : (
          <span>
            Next:{" "}
            <strong className="font-mono text-foreground">
              {nextChar === " " ? "Space" : (nextChar ?? "—")}
            </strong>
            {lookup.shift ? " · Shift" : ""}
            {lookup.altGr ? " · AltGr" : ""}
          </span>
        )}
        <span>
          {lookup.finger && showFingerZones ? `${FINGER_SHORT[lookup.finger]} · ` : ""}
          {layout.toUpperCase()}
        </span>
      </div>

      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-0.5">
          {row
            .filter((cell) => !cell.isModifier)
            .map((cell) => {
              const isTarget = cell.id === lookup.keyId;
              const baseLower = cell.base.toLowerCase();
              const isAlpha = /^[a-z]$/.test(baseLower);
              const isLocked = Boolean(isAlpha && lockedKeys?.has(baseLower));
              const isFocus = Boolean(isAlpha && focusKey && baseLower === focusKey.toLowerCase());
              const learnState = isLocked ? "locked" : isFocus ? "focus" : undefined;
              const label = cell.base.length === 1 ? cell.base.toUpperCase() : cell.base;
              return (
                <div
                  key={cell.id}
                  data-state={isTarget ? (errorFlash ? "error" : "active") : undefined}
                  data-finger={showFingerZones ? cell.finger : undefined}
                  data-home={cell.home ? "true" : undefined}
                  data-learn={learnState}
                  className="keycap flex h-7 min-w-0 flex-1 items-center justify-center font-mono text-[13px]"
                >
                  <span className="truncate">{label}</span>
                </div>
              );
            })}
        </div>
      ))}
    </div>
  );
}
