import { useEffect, useState } from "react";
import { Timer, Keyboard, LineChart } from "lucide-react";

export const ONBOARDED_KEY = "ttp:onboarded:v1";

interface Props {
  onStart: () => void;
}

export function Onboarding({ onStart }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && !localStorage.getItem(ONBOARDED_KEY)) {
        setOpen(true);
      }
    } catch {
      // storage unavailable
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!open) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(ONBOARDED_KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
    onStart();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Typing Trainer Pro"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
    >
      <div className="panel-raised w-full max-w-md space-y-5 p-6 text-center">
        <h2 className="font-mono text-2xl font-bold">
          Typing<span className="text-primary">Trainer</span>Pro
        </h2>
        <ol className="space-y-3 text-left text-sm">
          <li className="flex gap-3">
            <Timer className="mt-0.5 size-5 shrink-0 text-primary" />
            <span>
              <strong>Type to start.</strong> The timer begins on your first keystroke — no buttons.
            </span>
          </li>
          <li className="flex gap-3">
            <Keyboard className="mt-0.5 size-5 shrink-0 text-primary" />
            <span>
              <strong>Follow the glowing key.</strong> The keyboard shows your next key, including
              Shift.
            </span>
          </li>
          <li className="flex gap-3">
            <LineChart className="mt-0.5 size-5 shrink-0 text-primary" />
            <span>
              <strong>Get diagnosed.</strong> After each run we show your weakest keys — and build a
              drill to fix them.
            </span>
          </li>
        </ol>
        <button
          type="button"
          onClick={dismiss}
          autoFocus
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
        >
          Start 15-second test <kbd className="ml-1 opacity-70 font-mono text-xs">Esc</kbd>
        </button>
        <p className="text-xs text-muted-foreground">
          Everything stays in your browser. No account, no tracking.
        </p>
      </div>
    </div>
  );
}

export default Onboarding;
