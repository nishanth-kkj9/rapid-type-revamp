/** Shared physical-keyboard layout data (single source for Keyboard + KeyHeatmap). */

export const KEYBOARD_ROWS: string[][] = [
  ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"],
  ["Tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
  ["Caps", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "Enter"],
  ["Shift-L", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "Shift-R"],
  ["Space"],
];

export const KEY_WIDTHS: Record<string, string> = {
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
  "~": "`",
  "!": "1",
  "@": "2",
  "#": "3",
  $: "4",
  "%": "5",
  "^": "6",
  "&": "7",
  "*": "8",
  "(": "9",
  ")": "0",
  _: "-",
  "+": "=",
  "{": "[",
  "}": "]",
  "|": "\\",
  ":": ";",
  '"': "'",
  "<": ",",
  ">": ".",
  "?": "/",
};

export function keyFor(char: string | null): { key: string | null; shift: boolean } {
  if (!char) return { key: null, shift: false };
  if (char === " ") return { key: "Space", shift: false };
  if (SHIFTED[char]) return { key: SHIFTED[char], shift: true };
  if (/[A-Z]/.test(char)) return { key: char.toLowerCase(), shift: true };
  return { key: char, shift: false };
}
