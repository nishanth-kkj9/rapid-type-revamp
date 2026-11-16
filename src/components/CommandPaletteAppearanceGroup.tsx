import { CommandGroup, CommandItem } from "@/components/ui/command";
import { KEYBOARD_LAYOUTS, type KeyboardLayoutId } from "@/lib/keyboardLayout";
import type { ThemeAccent } from "@/lib/uiPrefs";
import type { SettingsTabId } from "@/lib/urlState";
import { THEME_LABELS, THEMES, type Theme } from "@/lib/useTheme";

const ACCENT_OPTIONS: { id: ThemeAccent; label: string }[] = [
  { id: "amber", label: "Amber Gold" },
  { id: "emerald", label: "Matrix Emerald" },
  { id: "cyan", label: "Ocean Cyan" },
  { id: "violet", label: "Cyberpunk Violet" },
  { id: "rose", label: "Ember Rose" },
];

const SETTINGS_TAB_ITEMS: { id: SettingsTabId; label: string; keywords: string }[] = [
  {
    id: "typing",
    label: "Settings: Typing & Daily Goal",
    keywords: "caret target wpm live metrics streak",
  },
  {
    id: "content",
    label: "Settings: Practice Content",
    keywords: "difficulty words numbers punctuation custom",
  },
  {
    id: "keyboard",
    label: "Settings: Keyboard & Layout",
    keywords: "dvorak colemak iso ansi finger zones",
  },
  { id: "sound", label: "Settings: Sound & Audio", keywords: "click beep mute shooter effects" },
  {
    id: "game",
    label: "Settings: Word Shooter Game",
    keywords: "arcade speed lives practice daily challenge",
  },
  {
    id: "appearance",
    label: "Settings: Appearance & Accessibility",
    keywords: "theme accent high contrast opendyslexic font pwa",
  },
  {
    id: "data",
    label: "Settings: Data & Privacy",
    keywords: "export backup import delete local storage indexeddb",
  },
];

interface CommandPaletteLookAndSettingsProps {
  keyboardLayout: KeyboardLayoutId;
  theme: Theme;
  accent: ThemeAccent;
  dyslexiaFont: boolean;
  onRun: (fn: () => void) => void;
  onKeyboardLayout: (layout: KeyboardLayoutId) => void;
  onSelectTheme: (theme: Theme) => void;
  onSelectAccent: (accent: ThemeAccent) => void;
  onToggleDyslexiaFont: () => void;
  onOpenSettingsTab: (tab: SettingsTabId) => void;
}

export function CommandPaletteLookAndSettings({
  keyboardLayout,
  theme,
  accent,
  dyslexiaFont,
  onRun,
  onKeyboardLayout,
  onSelectTheme,
  onSelectAccent,
  onToggleDyslexiaFont,
  onOpenSettingsTab,
}: CommandPaletteLookAndSettingsProps) {
  return (
    <>
      <CommandGroup heading="Keyboard Layouts">
        {KEYBOARD_LAYOUTS.map((l) => (
          <CommandItem
            key={l.id}
            value={`keyboard layout ${l.label} ${l.id}`}
            onSelect={() => onRun(() => onKeyboardLayout(l.id))}
          >
            <span>Layout: {l.label}</span>
            {keyboardLayout === l.id ? (
              <span className="ml-auto text-xs text-muted-foreground">current</span>
            ) : null}
          </CommandItem>
        ))}
      </CommandGroup>

      <CommandGroup heading="Theme & Accent Color">
        {THEMES.map((t) => (
          <CommandItem
            key={t}
            value={`theme ${THEME_LABELS[t]} ${t}`}
            onSelect={() => onRun(() => onSelectTheme(t))}
          >
            <span>Theme: {THEME_LABELS[t]}</span>
            {theme === t ? (
              <span className="ml-auto text-xs text-muted-foreground">current</span>
            ) : null}
          </CommandItem>
        ))}
        {ACCENT_OPTIONS.map((a) => (
          <CommandItem
            key={a.id}
            value={`accent color colour ${a.label} ${a.id}`}
            onSelect={() => onRun(() => onSelectAccent(a.id))}
          >
            <span>Accent: {a.label}</span>
            {accent === a.id ? (
              <span className="ml-auto text-xs text-muted-foreground">current</span>
            ) : null}
          </CommandItem>
        ))}
        <CommandItem
          value="dyslexia font opendyslexic accessibility"
          onSelect={() => onRun(onToggleDyslexiaFont)}
        >
          <span>Dyslexia-Friendly Font (OpenDyslexic)</span>
          <span className="ml-auto text-xs text-muted-foreground">
            {dyslexiaFont ? "on" : "off"}
          </span>
        </CommandItem>
      </CommandGroup>

      <CommandGroup heading="Settings">
        {SETTINGS_TAB_ITEMS.map((item) => (
          <CommandItem
            key={item.id}
            value={`${item.label} ${item.keywords}`}
            onSelect={() => onRun(() => onOpenSettingsTab(item.id))}
          >
            <span>{item.label}</span>
          </CommandItem>
        ))}
      </CommandGroup>
    </>
  );
}
