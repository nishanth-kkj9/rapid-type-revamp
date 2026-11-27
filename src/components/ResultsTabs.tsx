import { useId, useState } from "react";
import { Keyboard as KeyboardIcon, Type } from "lucide-react";
import type { KeyboardLayoutId, KeyboardStandard } from "@/lib/keyboardLayout";
import type { KeySpeedMap } from "@/lib/keySpeed";
import type { RunSlowWord } from "@/lib/typingStats";
import { KeyHeatmap } from "@/components/KeyHeatmap";
import { ProblemKeys } from "@/components/ProblemKeys";

type ResultsTabId = "keys" | "words";

interface ResultsTabsProps {
  mistakes: Record<string, number>;
  allTimeKeys: Record<string, number>;
  allTimeSpeed: KeySpeedMap;
  slowestWords: RunSlowWord[];
  mostMissedWords: { word: string; errors: number }[];
  keyboardLayout: KeyboardLayoutId;
  keyboardStandard: KeyboardStandard;
}

export function ResultsTabs({
  mistakes,
  allTimeKeys,
  allTimeSpeed,
  slowestWords,
  mostMissedWords,
  keyboardLayout,
  keyboardStandard,
}: ResultsTabsProps) {
  const [activeTab, setActiveTab] = useState<ResultsTabId>("keys");
  const baseId = useId();

  const wordSignalsCount = slowestWords.length + mostMissedWords.length;
  const tabs: { id: ResultsTabId; label: string; badge?: string; icon: typeof KeyboardIcon }[] = [
    { id: "keys", label: "Keys", icon: KeyboardIcon },
    {
      id: "words",
      label: "Words",
      ...(wordSignalsCount > 0
        ? { badge: String(mostMissedWords.length || slowestWords.length) }
        : {}),
      icon: Type,
    },
  ];

  return (
    <div className="mt-2 w-full">
      <div
        role="tablist"
        aria-label="Run breakdown"
        className="flex flex-wrap items-center justify-center gap-1 border-b border-border/70 pb-2"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`${baseId}-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                selected
                  ? "bg-primary/15 font-semibold text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              <span>{tab.label}</span>
              {tab.badge ? <span className="text-[13px] tabular-nums">({tab.badge})</span> : null}
            </button>
          );
        })}
      </div>

      <div className="pt-4">
        {activeTab === "keys" ? (
          <div
            id={`${baseId}-panel-keys`}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-keys`}
            className="flex flex-col items-center gap-3"
          >
            {Object.keys(mistakes).length > 0 ? (
              <ProblemKeys mistakes={mistakes} label="This run's missed keys" />
            ) : (
              <p className="text-[13px] text-muted-foreground">Zero missed keys in this run.</p>
            )}
            {Object.keys(allTimeKeys).length > 0 || Object.keys(allTimeSpeed).length > 0 ? (
              <KeyHeatmap
                mistakes={allTimeKeys}
                speed={allTimeSpeed}
                layout={keyboardLayout}
                standard={keyboardStandard}
              />
            ) : null}
          </div>
        ) : null}

        {activeTab === "words" ? (
          <div
            id={`${baseId}-panel-words`}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-words`}
            className="mx-auto grid w-full max-w-2xl grid-cols-1 gap-4 text-left sm:grid-cols-2"
          >
            <div className="rounded-xl border border-border/70 bg-card/70 p-3.5">
              <h3 className="text-sm font-medium text-muted-foreground">Slowest words</h3>
              {slowestWords.length === 0 ? (
                <p className="mt-2 text-[13px] text-muted-foreground">
                  Complete at least one multi-letter word to see word-level speed.
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-border/50 text-[13px]">
                  {slowestWords.map((item) => (
                    <li key={item.word} className="flex items-center justify-between py-1.5">
                      <span className="font-mono font-medium text-foreground">{item.word}</span>
                      <span className="font-mono tabular-nums text-muted-foreground">
                        <strong className="text-foreground">{item.wpm}</strong> wpm · {item.avgMs}ms
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-border/70 bg-card/70 p-3.5">
              <h3 className="text-sm font-medium text-muted-foreground">Most-missed words</h3>
              {mostMissedWords.length === 0 ? (
                <p className="mt-2 text-[13px] text-muted-foreground">
                  No word errors recorded in this run.
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-border/50 text-[13px]">
                  {mostMissedWords.map((item) => (
                    <li key={item.word} className="flex items-center justify-between py-1.5">
                      <span className="font-mono font-medium text-foreground">{item.word}</span>
                      <span className="font-mono tabular-nums text-destructive">
                        {item.errors} {item.errors === 1 ? "error" : "errors"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
