import { CommandGroup, CommandItem } from "@/components/ui/command";
import { KEYBOARD_LAYOUTS, type KeyboardLayoutId } from "@/lib/keyboardLayout";
import { THEME_LABELS, THEMES, type Theme } from "@/lib/useTheme";

interface CommandPaletteLookAndSettingsProps {
  keyboardLayout: KeyboardLayoutId;
  theme: Theme;
  dyslexiaFont: boolean;
  onRun: (fn: () => void) => void;
  onKeyboardLayout: (layout: KeyboardLayoutId) => void;
  onSelectTheme: (theme: Theme) => void;
  onToggleDyslexiaFont: () => void;
  onOpenSettings: () => void;
}

export function CommandPaletteLookAndSettings({
  keyboardLayout,
  theme,
  dyslexiaFont,
  onRun,
  onKeyboardLayout,
  onSelectTheme,
  onToggleDyslexiaFont,
  onOpenSettings,
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
              <span className="ml-auto text-[13px] text-muted-foreground">current</span>
            ) : null}
          </CommandItem>
        ))}
      </CommandGroup>

      <CommandGroup heading="Theme">
        {THEMES.map((t) => (
          <CommandItem
            key={t}
            value={`theme ${THEME_LABELS[t]} ${t}`}
            onSelect={() => onRun(() => onSelectTheme(t))}
          >
            <span>Theme: {THEME_LABELS[t]}</span>
            {theme === t ? (
              <span className="ml-auto text-[13px] text-muted-foreground">current</span>
            ) : null}
          </CommandItem>
        ))}
        <CommandItem
          value="dyslexia font opendyslexic accessibility"
          onSelect={() => onRun(onToggleDyslexiaFont)}
        >
          <span>Dyslexia-Friendly Font (OpenDyslexic)</span>
          <span className="ml-auto text-[13px] text-muted-foreground">
            {dyslexiaFont ? "on" : "off"}
          </span>
        </CommandItem>
      </CommandGroup>

      <CommandGroup heading="Settings">
        <CommandItem
          value="settings typing daily goal target wpm caret sound keyboard layout ansi iso appearance theme opendyslexic export backup import delete data"
          onSelect={() => onRun(onOpenSettings)}
        >
          <span>Open Settings</span>
        </CommandItem>
      </CommandGroup>
    </>
  );
}
