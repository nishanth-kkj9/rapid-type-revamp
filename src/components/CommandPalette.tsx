import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { Difficulty } from "@/lib/sentenceGenerator";

interface Props {
  difficulty: Difficulty;
  duration: number;
  difficulties: Difficulty[];
  durations: readonly number[];
  mode?: "drill" | "shooter";
  onDifficulty: (d: Difficulty) => void;
  onDuration: (s: number) => void;
  onRestart: () => void;
  onModeChange?: (m: "drill" | "shooter") => void;
  onOpenSettings?: () => void;
  onOpenDrillSettings?: () => void;
  onOpenShooterSettings?: () => void;
}

export function CommandPalette({
  difficulty,
  duration,
  difficulties,
  durations,
  mode = "drill",
  onDifficulty,
  onDuration,
  onRestart,
  onModeChange,
  onOpenSettings,
  onOpenDrillSettings,
  onOpenShooterSettings,
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const run = (fn: () => void) => {
    fn();
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Set mode, difficulty, length, or open settings…" />
      <CommandList>
        <CommandEmpty>No matching command.</CommandEmpty>
        {onModeChange ? (
          <CommandGroup heading="Game Mode">
            <CommandItem
              value="mode timed drill typing test"
              onSelect={() => run(() => onModeChange("drill"))}
            >
              <span>Timed Drill Mode</span>
              {mode === "drill" ? (
                <span className="ml-auto text-xs text-muted-foreground">current</span>
              ) : null}
            </CommandItem>
            <CommandItem
              value="mode word shooter arcade game"
              onSelect={() => run(() => onModeChange("shooter"))}
            >
              <span>Word Shooter Arcade</span>
              {mode === "shooter" ? (
                <span className="ml-auto text-xs text-muted-foreground">current</span>
              ) : null}
            </CommandItem>
          </CommandGroup>
        ) : null}
        <CommandGroup heading="Difficulty">
          {difficulties.map((d) => (
            <CommandItem
              key={d}
              value={`difficulty ${d}`}
              onSelect={() => run(() => onDifficulty(d))}
            >
              <span className="capitalize">{d}</span>
              {difficulty === d ? (
                <span className="ml-auto text-xs text-muted-foreground">current</span>
              ) : null}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Test length">
          {durations.map((s) => (
            <CommandItem
              key={s}
              value={`duration ${s} seconds`}
              onSelect={() => run(() => onDuration(s))}
            >
              <span className="font-mono">{s}s</span>
              {duration === s ? (
                <span className="ml-auto text-xs text-muted-foreground">current</span>
              ) : null}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Settings">
          <CommandItem
            value="timed drill settings duration cursor sound target wpm"
            onSelect={() =>
              run(() => (onOpenDrillSettings ? onOpenDrillSettings() : onOpenSettings?.()))
            }
          >
            <span>Timed Drill Settings</span>
          </CommandItem>
          <CommandItem
            value="word shooter settings difficulty falling speed lives audio"
            onSelect={() =>
              run(() => (onOpenShooterSettings ? onOpenShooterSettings() : onOpenSettings?.()))
            }
          >
            <span>Word Shooter Settings</span>
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Actions">
          <CommandItem value="restart test" onSelect={() => run(onRestart)}>
            Restart test
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
