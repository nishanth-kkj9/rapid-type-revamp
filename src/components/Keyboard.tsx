const ROWS: string[][] = [
  ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"],
  ["Tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
  ["Caps", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "Enter"],
  ["Shift-L", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "Shift-R"],
  ["Space"],
];

const WIDTHS: Record<string, string> = {
  Backspace: "flex-[2]",
  Tab: "flex-[1.6]",
  "\\": "flex-[1.4]",
  Caps: "flex-[1.9]",
  Enter: "flex-[2.1]",
  "Shift-L": "flex-[2.5]",
  "Shift-R": "flex-[2.5]",
  Space: "flex-[10]",
};

const SHIFTED: Record<string, string> = {
  "~": "`", "!": "1", "@": "2", "#": "3", $: "4", "%": "5", "^": "6",
  "&": "7", "*": "8", "(": "9", ")": "0", _: "-", "+": "=",
  "{": "[", "}": "]", "|": "\\", ":": ";", '"': "'", "<": ",", ">": ".", "?": "/",
};

function keyFor(char: string | null): { key: string | null; shift: boolean } {
  if (!char) return { key: null, shift: false };
  if (char === " ") return { key: "Space", shift: false };
  if (SHIFTED[char]) return { key: SHIFTED[char], shift: true };
  if (/[A-Z]/.test(char)) return { key: char.toLowerCase(), shift: true };
  return { key: char, shift: false };
}

interface Props {
  nextChar: string | null;
  errorFlash: boolean;
  pressedChar?: string | null;
}

export function Keyboard({ nextChar, errorFlash, pressedChar }: Props) {
  const { key: target, shift } = keyFor(nextChar);
  const { key: pressed } = keyFor(pressedChar ?? null);

  return (
    <div className="panel select-none space-y-1.5 p-3 sm:p-4" aria-hidden="true">
      {ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1.5">
          {row.map((k) => {
            const isShift = k === "Shift-L" || k === "Shift-R";
            const isTarget = k === target || (shift && isShift);
            const displayLabel = isShift ? "Shift" : k === "Space" ? "" : k;
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
                className={`keycap flex h-9 items-center justify-center px-1 font-mono text-[11px] uppercase sm:h-11 sm:text-xs ${
                  WIDTHS[k] ?? "flex-1"
                }`}
              >
                {displayLabel}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
