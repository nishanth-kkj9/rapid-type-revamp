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
  onDifficulty: (d: Difficulty) => void;
  onDuration: (s: number) => void;
  onRestart: () => void;
}

export function CommandPalette({
  difficulty,
  duration,
  difficulties,
  durations,
  onDifficulty,
  onDuration,
  onRestart,
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
      <CommandInput placeholder="Set difficulty, length, or restart…" />
      <CommandList>
        <CommandEmpty>No matching command.</CommandEmpty>
        <CommandGroup heading="Difficulty">
          {difficulties.map((d) => (
            <CommandItem key={d} value={`difficulty ${d}`} onSelect={() => run(() => onDifficulty(d))}>
              <span className="capitalize">{d}</span>
              {difficulty === d ? (
                <span className="ml-auto text-xs text-muted-foreground">current</span>
              ) : null}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Test length">
          {durations.map((s) => (
            <CommandItem key={s} value={`duration ${s} seconds`} onSelect={() => run(() => onDuration(s))}>
              <span className="font-mono">{s}s</span>
              {duration === s ? (
                <span className="ml-auto text-xs text-muted-foreground">current</span>
              ) : null}
            </CommandItem>
          ))}
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
