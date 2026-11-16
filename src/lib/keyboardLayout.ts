/** Physical & logical keyboard layouts for Keyboard v2 and KeyHeatmap. */

export type KeyboardLayoutId = "qwerty" | "dvorak" | "colemak" | "qwertz" | "azerty";
export type KeyboardStandard = "ansi" | "iso";

export type FingerZone =
  | "l-pinky"
  | "l-ring"
  | "l-middle"
  | "l-index"
  | "r-index"
  | "r-middle"
  | "r-ring"
  | "r-pinky"
  | "thumb";

export interface KeyDef {
  id: string;
  base: string;
  shift?: string | undefined;
  altGr?: string | undefined;
  finger: FingerZone;
  home?: boolean | undefined;
  width?: string | undefined;
  isModifier?: boolean | undefined;
}

export const KEYBOARD_LAYOUTS: { id: KeyboardLayoutId; label: string }[] = [
  { id: "qwerty", label: "QWERTY" },
  { id: "dvorak", label: "Dvorak" },
  { id: "colemak", label: "Colemak" },
  { id: "qwertz", label: "QWERTZ" },
  { id: "azerty", label: "AZERTY" },
];

export const KEYBOARD_STANDARDS: { id: KeyboardStandard; label: string }[] = [
  { id: "ansi", label: "ANSI" },
  { id: "iso", label: "ISO" },
];

function k(
  id: string,
  base: string,
  finger: FingerZone,
  shift?: string,
  opts?: { altGr?: string; home?: boolean; width?: string; isModifier?: boolean },
): KeyDef {
  return {
    id,
    base,
    shift,
    altGr: opts?.altGr,
    finger,
    home: opts?.home,
    width: opts?.width,
    isModifier: opts?.isModifier,
  };
}

function mod(id: string, base: string, finger: FingerZone, width: string): KeyDef {
  return k(id, base, finger, undefined, { width, isModifier: true });
}

const ANSI_NUM_ROW: KeyDef[] = [
  k("Backquote", "`", "l-pinky", "~"),
  k("Digit1", "1", "l-pinky", "!"),
  k("Digit2", "2", "l-ring", "@"),
  k("Digit3", "3", "l-middle", "#"),
  k("Digit4", "4", "l-index", "$"),
  k("Digit5", "5", "l-index", "%"),
  k("Digit6", "6", "r-index", "^"),
  k("Digit7", "7", "r-index", "&"),
  k("Digit8", "8", "r-middle", "*"),
  k("Digit9", "9", "r-ring", "("),
  k("Digit0", "0", "r-pinky", ")"),
  k("Minus", "-", "r-pinky", "_"),
  k("Equal", "=", "r-pinky", "+"),
  mod("Backspace", "Backspace", "r-pinky", "flex-[2]"),
];

const QWERTZ_NUM_ROW: KeyDef[] = [
  k("Backquote", "^", "l-pinky", "°"),
  k("Digit1", "1", "l-pinky", "!"),
  k("Digit2", "2", "l-ring", '"'),
  k("Digit3", "3", "l-middle", "§"),
  k("Digit4", "4", "l-index", "$"),
  k("Digit5", "5", "l-index", "%"),
  k("Digit6", "6", "r-index", "&"),
  k("Digit7", "7", "r-index", "/", { altGr: "{" }),
  k("Digit8", "8", "r-middle", "(", { altGr: "[" }),
  k("Digit9", "9", "r-ring", ")", { altGr: "]" }),
  k("Digit0", "0", "r-pinky", "=", { altGr: "}" }),
  k("Minus", "ß", "r-pinky", "?", { altGr: "\\" }),
  k("Equal", "´", "r-pinky", "`"),
  mod("Backspace", "Backspace", "r-pinky", "flex-[2]"),
];

const AZERTY_NUM_ROW: KeyDef[] = [
  k("Backquote", "²", "l-pinky"),
  k("Digit1", "&", "l-pinky", "1"),
  k("Digit2", "é", "l-ring", "2", { altGr: "~" }),
  k("Digit3", '"', "l-middle", "3", { altGr: "#" }),
  k("Digit4", "'", "l-index", "4", { altGr: "{" }),
  k("Digit5", "(", "l-index", "5", { altGr: "[" }),
  k("Digit6", "-", "r-index", "6", { altGr: "|" }),
  k("Digit7", "è", "r-index", "7", { altGr: "`" }),
  k("Digit8", "_", "r-middle", "8", { altGr: "\\" }),
  k("Digit9", "ç", "r-ring", "9", { altGr: "^" }),
  k("Digit0", "à", "r-pinky", "0", { altGr: "@" }),
  k("Minus", ")", "r-pinky", "°", { altGr: "]" }),
  k("Equal", "=", "r-pinky", "+", { altGr: "}" }),
  mod("Backspace", "Backspace", "r-pinky", "flex-[2]"),
];

const DVORAK_NUM_ROW: KeyDef[] = [
  ...ANSI_NUM_ROW.slice(0, 11),
  k("Minus", "[", "r-pinky", "{"),
  k("Equal", "]", "r-pinky", "}"),
  mod("Backspace", "Backspace", "r-pinky", "flex-[2]"),
];

function buildLetterRows(layout: KeyboardLayoutId, standard: KeyboardStandard): KeyDef[][] {
  const isoRight = standard === "iso";

  if (layout === "dvorak") {
    return [
      DVORAK_NUM_ROW,
      [
        mod("Tab", "Tab", "l-pinky", "flex-[1.6]"),
        k("KeyQ", "'", "l-pinky", '"'),
        k("KeyW", ",", "l-ring", "<"),
        k("KeyE", ".", "l-middle", ">"),
        k("KeyR", "p", "l-index"),
        k("KeyT", "y", "l-index"),
        k("KeyY", "f", "r-index"),
        k("KeyU", "g", "r-index"),
        k("KeyI", "c", "r-middle"),
        k("KeyO", "r", "r-ring"),
        k("KeyP", "l", "r-pinky"),
        k("BracketLeft", "/", "r-pinky", "?"),
        k("BracketRight", "=", "r-pinky", "+"),
        ...(isoRight
          ? [mod("EnterTop", "Enter", "r-pinky", "flex-[1.4]")]
          : [k("Backslash", "\\", "r-pinky", "|", { width: "flex-[1.4]" })]),
      ],
      [
        mod("Caps", "Caps", "l-pinky", "flex-[1.9]"),
        k("KeyA", "a", "l-pinky"),
        k("KeyS", "o", "l-ring"),
        k("KeyD", "e", "l-middle"),
        k("KeyF", "u", "l-index", undefined, { home: true }),
        k("KeyG", "i", "l-index"),
        k("KeyH", "d", "r-index"),
        k("KeyJ", "h", "r-index", undefined, { home: true }),
        k("KeyK", "t", "r-middle"),
        k("KeyL", "n", "r-ring"),
        k("Semicolon", "s", "r-pinky"),
        k("Quote", "-", "r-pinky", "_"),
        ...(isoRight
          ? [k("Backslash", "\\", "r-pinky", "|"), mod("Enter", "Enter", "r-pinky", "flex-[1.6]")]
          : [mod("Enter", "Enter", "r-pinky", "flex-[2.1]")]),
      ],
      [
        mod("Shift-L", "Shift", "l-pinky", isoRight ? "flex-[1.4]" : "flex-[2.5]"),
        ...(isoRight ? [k("IsoExtra", "<", "l-pinky", ">")] : []),
        k("KeyZ", ";", "l-pinky", ":"),
        k("KeyX", "q", "l-ring"),
        k("KeyC", "j", "l-middle"),
        k("KeyV", "k", "l-index"),
        k("KeyB", "x", "l-index"),
        k("KeyN", "b", "r-index"),
        k("KeyM", "m", "r-index"),
        k("Comma", "w", "r-middle"),
        k("Period", "v", "r-ring"),
        k("Slash", "z", "r-pinky"),
        mod("Shift-R", "Shift", "r-pinky", "flex-[2.5]"),
      ],
      [mod("Space", "Space", "thumb", "flex-[10]")],
    ];
  }

  if (layout === "colemak") {
    return [
      ANSI_NUM_ROW,
      [
        mod("Tab", "Tab", "l-pinky", "flex-[1.6]"),
        k("KeyQ", "q", "l-pinky"),
        k("KeyW", "w", "l-ring"),
        k("KeyE", "f", "l-middle"),
        k("KeyR", "p", "l-index"),
        k("KeyT", "g", "l-index"),
        k("KeyY", "j", "r-index"),
        k("KeyU", "l", "r-index"),
        k("KeyI", "u", "r-middle"),
        k("KeyO", "y", "r-ring"),
        k("KeyP", ";", "r-pinky", ":"),
        k("BracketLeft", "[", "r-pinky", "{"),
        k("BracketRight", "]", "r-pinky", "}"),
        ...(isoRight
          ? [mod("EnterTop", "Enter", "r-pinky", "flex-[1.4]")]
          : [k("Backslash", "\\", "r-pinky", "|", { width: "flex-[1.4]" })]),
      ],
      [
        mod("Caps", "Caps", "l-pinky", "flex-[1.9]"),
        k("KeyA", "a", "l-pinky"),
        k("KeyS", "r", "l-ring"),
        k("KeyD", "s", "l-middle"),
        k("KeyF", "t", "l-index", undefined, { home: true }),
        k("KeyG", "d", "l-index"),
        k("KeyH", "h", "r-index"),
        k("KeyJ", "n", "r-index", undefined, { home: true }),
        k("KeyK", "e", "r-middle"),
        k("KeyL", "i", "r-ring"),
        k("Semicolon", "o", "r-pinky"),
        k("Quote", "'", "r-pinky", '"'),
        ...(isoRight
          ? [k("Backslash", "\\", "r-pinky", "|"), mod("Enter", "Enter", "r-pinky", "flex-[1.6]")]
          : [mod("Enter", "Enter", "r-pinky", "flex-[2.1]")]),
      ],
      [
        mod("Shift-L", "Shift", "l-pinky", isoRight ? "flex-[1.4]" : "flex-[2.5]"),
        ...(isoRight ? [k("IsoExtra", "\\", "l-pinky", "|")] : []),
        k("KeyZ", "z", "l-pinky"),
        k("KeyX", "x", "l-ring"),
        k("KeyC", "c", "l-middle"),
        k("KeyV", "v", "l-index"),
        k("KeyB", "b", "l-index"),
        k("KeyN", "k", "r-index"),
        k("KeyM", "m", "r-index"),
        k("Comma", ",", "r-middle", "<"),
        k("Period", ".", "r-ring", ">"),
        k("Slash", "/", "r-pinky", "?"),
        mod("Shift-R", "Shift", "r-pinky", "flex-[2.5]"),
      ],
      [mod("Space", "Space", "thumb", "flex-[10]")],
    ];
  }

  if (layout === "qwertz") {
    return [
      QWERTZ_NUM_ROW,
      [
        mod("Tab", "Tab", "l-pinky", "flex-[1.6]"),
        k("KeyQ", "q", "l-pinky", undefined, { altGr: "@" }),
        k("KeyW", "w", "l-ring"),
        k("KeyE", "e", "l-middle"),
        k("KeyR", "r", "l-index"),
        k("KeyT", "t", "l-index"),
        k("KeyY", "z", "r-index"),
        k("KeyU", "u", "r-index"),
        k("KeyI", "i", "r-middle"),
        k("KeyO", "o", "r-ring"),
        k("KeyP", "p", "r-pinky"),
        k("BracketLeft", "ü", "r-pinky"),
        k("BracketRight", "+", "r-pinky", "*", { altGr: "~" }),
        ...(isoRight
          ? [mod("EnterTop", "Enter", "r-pinky", "flex-[1.4]")]
          : [k("Backslash", "#", "r-pinky", "'", { width: "flex-[1.4]" })]),
      ],
      [
        mod("Caps", "Caps", "l-pinky", "flex-[1.9]"),
        k("KeyA", "a", "l-pinky"),
        k("KeyS", "s", "l-ring"),
        k("KeyD", "d", "l-middle"),
        k("KeyF", "f", "l-index", undefined, { home: true }),
        k("KeyG", "g", "l-index"),
        k("KeyH", "h", "r-index"),
        k("KeyJ", "j", "r-index", undefined, { home: true }),
        k("KeyK", "k", "r-middle"),
        k("KeyL", "l", "r-ring"),
        k("Semicolon", "ö", "r-pinky"),
        k("Quote", "ä", "r-pinky"),
        ...(isoRight
          ? [k("Backslash", "#", "r-pinky", "'"), mod("Enter", "Enter", "r-pinky", "flex-[1.6]")]
          : [mod("Enter", "Enter", "r-pinky", "flex-[2.1]")]),
      ],
      [
        mod("Shift-L", "Shift", "l-pinky", isoRight ? "flex-[1.4]" : "flex-[2.5]"),
        ...(isoRight ? [k("IsoExtra", "<", "l-pinky", ">", { altGr: "|" })] : []),
        k("KeyZ", "y", "l-pinky"),
        k("KeyX", "x", "l-ring"),
        k("KeyC", "c", "l-middle"),
        k("KeyV", "v", "l-index"),
        k("KeyB", "b", "l-index"),
        k("KeyN", "n", "r-index"),
        k("KeyM", "m", "r-index"),
        k("Comma", ",", "r-middle", ";"),
        k("Period", ".", "r-ring", ":"),
        k("Slash", "-", "r-pinky", "_"),
        mod("Shift-R", "Shift", "r-pinky", "flex-[2.5]"),
      ],
      [mod("Space", "Space", "thumb", "flex-[10]")],
    ];
  }

  if (layout === "azerty") {
    return [
      AZERTY_NUM_ROW,
      [
        mod("Tab", "Tab", "l-pinky", "flex-[1.6]"),
        k("KeyQ", "a", "l-pinky"),
        k("KeyW", "z", "l-ring"),
        k("KeyE", "e", "l-middle"),
        k("KeyR", "r", "l-index"),
        k("KeyT", "t", "l-index"),
        k("KeyY", "y", "r-index"),
        k("KeyU", "u", "r-index"),
        k("KeyI", "i", "r-middle"),
        k("KeyO", "o", "r-ring"),
        k("KeyP", "p", "r-pinky"),
        k("BracketLeft", "^", "r-pinky", "¨"),
        k("BracketRight", "$", "r-pinky", "£"),
        ...(isoRight
          ? [mod("EnterTop", "Enter", "r-pinky", "flex-[1.4]")]
          : [k("Backslash", "*", "r-pinky", "µ", { width: "flex-[1.4]" })]),
      ],
      [
        mod("Caps", "Caps", "l-pinky", "flex-[1.9]"),
        k("KeyA", "q", "l-pinky"),
        k("KeyS", "s", "l-ring"),
        k("KeyD", "d", "l-middle"),
        k("KeyF", "f", "l-index", undefined, { home: true }),
        k("KeyG", "g", "l-index"),
        k("KeyH", "h", "r-index"),
        k("KeyJ", "j", "r-index", undefined, { home: true }),
        k("KeyK", "k", "r-middle"),
        k("KeyL", "l", "r-ring"),
        k("Semicolon", "m", "r-pinky"),
        k("Quote", "ù", "r-pinky", "%"),
        ...(isoRight
          ? [k("Backslash", "*", "r-pinky", "µ"), mod("Enter", "Enter", "r-pinky", "flex-[1.6]")]
          : [mod("Enter", "Enter", "r-pinky", "flex-[2.1]")]),
      ],
      [
        mod("Shift-L", "Shift", "l-pinky", isoRight ? "flex-[1.4]" : "flex-[2.5]"),
        ...(isoRight ? [k("IsoExtra", "<", "l-pinky", ">")] : []),
        k("KeyZ", "w", "l-pinky"),
        k("KeyX", "x", "l-ring"),
        k("KeyC", "c", "l-middle"),
        k("KeyV", "v", "l-index"),
        k("KeyB", "b", "l-index"),
        k("KeyN", ",", "r-index", "?"),
        k("KeyM", ";", "r-index", "."),
        k("Comma", ":", "r-middle", "/"),
        k("Period", "!", "r-ring", "§"),
        k("Slash", "n", "r-pinky"),
        mod("Shift-R", "Shift", "r-pinky", "flex-[2.5]"),
      ],
      [mod("Space", "Space", "thumb", "flex-[10]")],
    ];
  }

  // Default: QWERTY
  return [
    ANSI_NUM_ROW,
    [
      mod("Tab", "Tab", "l-pinky", "flex-[1.6]"),
      k("KeyQ", "q", "l-pinky"),
      k("KeyW", "w", "l-ring"),
      k("KeyE", "e", "l-middle"),
      k("KeyR", "r", "l-index"),
      k("KeyT", "t", "l-index"),
      k("KeyY", "y", "r-index"),
      k("KeyU", "u", "r-index"),
      k("KeyI", "i", "r-middle"),
      k("KeyO", "o", "r-ring"),
      k("KeyP", "p", "r-pinky"),
      k("BracketLeft", "[", "r-pinky", "{"),
      k("BracketRight", "]", "r-pinky", "}"),
      ...(isoRight
        ? [mod("EnterTop", "Enter", "r-pinky", "flex-[1.4]")]
        : [k("Backslash", "\\", "r-pinky", "|", { width: "flex-[1.4]" })]),
    ],
    [
      mod("Caps", "Caps", "l-pinky", "flex-[1.9]"),
      k("KeyA", "a", "l-pinky"),
      k("KeyS", "s", "l-ring"),
      k("KeyD", "d", "l-middle"),
      k("KeyF", "f", "l-index", undefined, { home: true }),
      k("KeyG", "g", "l-index"),
      k("KeyH", "h", "r-index"),
      k("KeyJ", "j", "r-index", undefined, { home: true }),
      k("KeyK", "k", "r-middle"),
      k("KeyL", "l", "r-ring"),
      k("Semicolon", ";", "r-pinky", ":"),
      k("Quote", "'", "r-pinky", '"'),
      ...(isoRight
        ? [k("Backslash", "\\", "r-pinky", "|"), mod("Enter", "Enter", "r-pinky", "flex-[1.6]")]
        : [mod("Enter", "Enter", "r-pinky", "flex-[2.1]")]),
    ],
    [
      mod("Shift-L", "Shift", "l-pinky", isoRight ? "flex-[1.4]" : "flex-[2.5]"),
      ...(isoRight ? [k("IsoExtra", "\\", "l-pinky", "|")] : []),
      k("KeyZ", "z", "l-pinky"),
      k("KeyX", "x", "l-ring"),
      k("KeyC", "c", "l-middle"),
      k("KeyV", "v", "l-index"),
      k("KeyB", "b", "l-index"),
      k("KeyN", "n", "r-index"),
      k("KeyM", "m", "r-index"),
      k("Comma", ",", "r-middle", "<"),
      k("Period", ".", "r-ring", ">"),
      k("Slash", "/", "r-pinky", "?"),
      mod("Shift-R", "Shift", "r-pinky", "flex-[2.5]"),
    ],
    [mod("Space", "Space", "thumb", "flex-[10]")],
  ];
}

export function getKeyboardRows(
  layout: KeyboardLayoutId = "qwerty",
  standard: KeyboardStandard = "ansi",
): KeyDef[][] {
  return buildLetterRows(layout, standard);
}

/** Legacy static rows & widths for QWERTY ANSI compatibility. */
export const KEYBOARD_ROWS: string[][] = getKeyboardRows("qwerty", "ansi").map((row) =>
  row.map((cell) => (cell.isModifier ? cell.id : cell.base)),
);

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

export interface KeyLookupResult {
  key: string | null;
  keyId: string | null;
  shift: boolean;
  altGr: boolean;
  finger: FingerZone | null;
  unmapped: boolean;
}

export function keyFor(
  char: string | null,
  layout: KeyboardLayoutId = "qwerty",
  standard: KeyboardStandard = "ansi",
): KeyLookupResult {
  if (!char) {
    return { key: null, keyId: null, shift: false, altGr: false, finger: null, unmapped: false };
  }
  if (char === " ") {
    return {
      key: "Space",
      keyId: "Space",
      shift: false,
      altGr: false,
      finger: "thumb",
      unmapped: false,
    };
  }

  const rows = getKeyboardRows(layout, standard);
  const lower = char.toLowerCase();
  const isUpperLetter = char !== lower && /^[a-zà-öø-þ]$/i.test(char);

  for (const row of rows) {
    for (const cell of row) {
      if (cell.isModifier) continue;
      if (cell.base === char) {
        return {
          key: cell.base,
          keyId: cell.id,
          shift: false,
          altGr: false,
          finger: cell.finger,
          unmapped: false,
        };
      }
      if (cell.shift === char || (isUpperLetter && cell.base === lower)) {
        return {
          key: cell.base,
          keyId: cell.id,
          shift: true,
          altGr: false,
          finger: cell.finger,
          unmapped: false,
        };
      }
      if (cell.altGr === char) {
        return {
          key: cell.base,
          keyId: cell.id,
          shift: false,
          altGr: true,
          finger: cell.finger,
          unmapped: false,
        };
      }
    }
  }

  return {
    key: null,
    keyId: null,
    shift: false,
    altGr: false,
    finger: null,
    unmapped: true,
  };
}
