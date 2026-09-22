import { useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { importHistoryResult, type HistoryEntry } from "@/lib/typingStats";
import { toast } from "sonner";
import {
  AlertCircle,
  Trash2,
  Timer,
  Crosshair,
  Download,
  Upload,
  Trophy,
  Target,
  Zap,
} from "lucide-react";

interface Props {
  history: HistoryEntry[];
  mode: "drill" | "shooter";
  onClear: (mode?: "all" | "drill" | "shooter") => void;
  onImport?: (entries: HistoryEntry[]) => void;
}

const DRILL_DURATIONS = ["all", "15s", "30s", "60s", "120s"] as const;
type DrillDurationFilter = (typeof DRILL_DURATIONS)[number];

const DIFFICULTIES = ["all", "easy", "medium", "hard"] as const;
type DifficultyFilter = (typeof DIFFICULTIES)[number];

export function HistoryPanel({ history, mode, onClear, onImport }: Props) {
  const [importError, setImportError] = useState<string | null>(null);
  const [drillDuration, setDrillDuration] = useState<DrillDurationFilter>("all");
  const [drillDifficulty, setDrillDifficulty] = useState<DifficultyFilter>("all");
  const [shooterDifficulty, setShooterDifficulty] = useState<DifficultyFilter>("all");
  const [confirmClear, setConfirmClear] = useState<boolean>(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Split history by mode
  const drillAll = useMemo(() => history.filter((h) => h.mode !== "shooter"), [history]);
  const shooterAll = useMemo(() => history.filter((h) => h.mode === "shooter"), [history]);

  // Filtered Drill History
  const filteredDrillHistory = useMemo(() => {
    return drillAll.filter((h) => {
      // Duration filter
      if (drillDuration !== "all") {
        const m = (h.mode || "30").toLowerCase();
        const matchesDuration = m === drillDuration || m === drillDuration.replace("s", "");
        if (!matchesDuration) return false;
      }
      // Difficulty filter
      if (drillDifficulty !== "all") {
        if (h.difficulty.toLowerCase() !== drillDifficulty) return false;
      }
      return true;
    });
  }, [drillAll, drillDuration, drillDifficulty]);

  // Filtered Shooter History
  const filteredShooterHistory = useMemo(() => {
    return shooterAll.filter((h) => {
      if (shooterDifficulty !== "all") {
        if (h.difficulty.toLowerCase() !== shooterDifficulty) return false;
      }
      return true;
    });
  }, [shooterAll, shooterDifficulty]);

  // Drill Stats
  const drillBestWpm = useMemo(
    () => filteredDrillHistory.reduce((m, h) => Math.max(m, h.wpm), 0),
    [filteredDrillHistory],
  );
  const drillAvgWpm = useMemo(
    () =>
      filteredDrillHistory.length
        ? filteredDrillHistory.reduce((a, h) => a + h.wpm, 0) / filteredDrillHistory.length
        : 0,
    [filteredDrillHistory],
  );
  const drillAvgAccuracy = useMemo(
    () =>
      filteredDrillHistory.length
        ? filteredDrillHistory.reduce((a, h) => a + h.accuracy, 0) / filteredDrillHistory.length
        : 0,
    [filteredDrillHistory],
  );
  const drillImprovement = useMemo(() => {
    if (filteredDrillHistory.length < 10) return 0;
    const first5 = filteredDrillHistory.slice(-5).reduce((a, h) => a + h.wpm, 0) / 5;
    const last5 = filteredDrillHistory.slice(0, 5).reduce((a, h) => a + h.wpm, 0) / 5;
    return first5 > 0 ? ((last5 - first5) / first5) * 100 : 0;
  }, [filteredDrillHistory]);

  // Drill Chart Data
  const drillChartData = useMemo(
    () =>
      filteredDrillHistory
        .slice(0, 25)
        .reverse()
        .map((h, i) => ({
          run: i + 1,
          wpm: Math.round(h.wpm),
          rawWpm: Math.round(h.rawWpm || h.wpm),
          accuracy: Math.round(h.accuracy),
          mode: h.mode ? (h.mode.endsWith("s") ? h.mode : `${h.mode}s`) : "30s",
          diff: h.difficulty,
          date: new Date(h.date).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        })),
    [filteredDrillHistory],
  );

  // Shooter Stats
  const shooterHighScore = useMemo(
    () =>
      filteredShooterHistory.reduce((m, h) => Math.max(m, h.score ?? Math.round(h.wpm * 10)), 0),
    [filteredShooterHistory],
  );
  const shooterBestLevel = useMemo(
    () =>
      filteredShooterHistory.reduce(
        (m, h) => Math.max(m, h.level ?? 1),
        filteredShooterHistory.length > 0 ? 1 : 0,
      ),
    [filteredShooterHistory],
  );
  const shooterAvgScore = useMemo(
    () =>
      filteredShooterHistory.length
        ? filteredShooterHistory.reduce((a, h) => a + (h.score ?? Math.round(h.wpm * 10)), 0) /
          filteredShooterHistory.length
        : 0,
    [filteredShooterHistory],
  );
  const shooterAvgAccuracy = useMemo(
    () =>
      filteredShooterHistory.length
        ? filteredShooterHistory.reduce((a, h) => a + h.accuracy, 0) / filteredShooterHistory.length
        : 0,
    [filteredShooterHistory],
  );

  // Shooter Chart Data
  const shooterChartData = useMemo(
    () =>
      filteredShooterHistory
        .slice(0, 25)
        .reverse()
        .map((h, i) => ({
          game: i + 1,
          score: h.score ?? Math.round(h.wpm * 10),
          level: h.level ?? 1,
          words: h.wordsDestroyed ?? h.correct ?? 0,
          accuracy: Math.round(h.accuracy),
          diff: h.difficulty,
          date: new Date(h.date).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        })),
    [filteredShooterHistory],
  );

  const handleExport = () => {
    const listToExport = mode === "drill" ? drillAll : shooterAll;
    const blob = new Blob([JSON.stringify(listToExport, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${mode}-history-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const res = importHistoryResult(String(event.target?.result ?? ""));
      if (!res.ok) {
        if (res.reason === "quota") {
          setImportError("Browser storage is full. Please clear space or export existing runs.");
        } else {
          setImportError("Invalid or corrupted history JSON file.");
        }
      } else {
        setImportError(null);
        toast.success(`Imported ${res.list.length} history records.`);
        onImport?.(res.list);
      }
    };
    reader.readAsText(file);
  };

  const handleClearCurrentMode = () => {
    const previous = [...history];
    onClear(mode);
    setConfirmClear(false);
    const label = mode === "drill" ? "Drill history cleared" : "Shooter history cleared";
    toast(label, {
      action: {
        label: "Undo",
        onClick: () => {
          const res = importHistoryResult(JSON.stringify(previous));
          if (res.ok) {
            onImport?.(res.list);
            toast.success("History restored.");
          } else {
            setImportError("Could not restore history — storage is full.");
          }
        },
      },
      duration: 6000,
    });
  };

  const currentModeRunsCount = mode === "drill" ? drillAll.length : shooterAll.length;

  return (
    <section className="panel p-5">
      {/* Header: Mode Title & Action Tools */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {mode === "drill" ? (
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
              <Timer className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  Timed Drill Progress
                </h2>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
                  {drillAll.length} {drillAll.length === 1 ? "run" : "runs"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Speed and accuracy tracked over timed test sessions
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg border border-accent/25 bg-accent/10 text-accent">
              <Crosshair className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  Word Shooter Progress
                </h2>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
                  {shooterAll.length} {shooterAll.length === 1 ? "game" : "games"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                High scores, levels reached, and accuracy from arcade battles
              </p>
            </div>
          </div>
        )}

        {/* Global actions: Export, Import, Clear */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={currentModeRunsCount === 0}
            title={`Export ${mode === "drill" ? "Drill" : "Shooter"} history`}
            className="flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 cursor-pointer"
          >
            <Download className="size-3" />
            Export
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
          >
            <Upload className="size-3" />
            Import
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            data-lpignore="true"
            data-protonpass-ignore="true"
            data-1p-ignore="true"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
              e.target.value = "";
            }}
          />

          {currentModeRunsCount > 0 ? (
            confirmClear ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleClearCurrentMode}
                  className="flex items-center gap-1 rounded-md bg-destructive px-2.5 py-1 text-xs font-semibold text-destructive-foreground transition-opacity hover:opacity-90 cursor-pointer"
                >
                  <Trash2 className="size-3" />
                  Clear {mode === "drill" ? "Drill Runs" : "Shooter Games"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="rounded-md px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive cursor-pointer"
              >
                Clear
              </button>
            )
          ) : null}
        </div>
      </div>

      {importError ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-destructive/15 p-2.5 text-xs text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{importError}</span>
        </div>
      ) : null}

      {/* ========================================================= */}
      {/* TIMED DRILL PROGRESS VIEW ONLY                            */}
      {/* ========================================================= */}
      {mode === "drill" && (
        <div className="mt-4">
          {/* Filters: Duration & Difficulty */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mr-1">
                Duration:
              </span>
              {DRILL_DURATIONS.map((d) => {
                const active = drillDuration === d;
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDrillDuration(d)}
                    className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {d === "all" ? "All Durations" : d}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mr-1">
                Diff:
              </span>
              {DIFFICULTIES.map((diff) => {
                const active = drillDifficulty === diff;
                return (
                  <button
                    key={diff}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDrillDifficulty(diff)}
                    className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize transition-colors cursor-pointer ${
                      active
                        ? "bg-foreground text-background font-semibold"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {diff}
                  </button>
                );
              })}
            </div>
          </div>

          {drillAll.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              No timed drill runs completed yet. Start a test above to record your speed!
            </p>
          ) : filteredDrillHistory.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              No runs recorded matching the selected filter criteria.
            </p>
          ) : (
            <>
              {/* Drill KPI Cards */}
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
                <div className="rounded-xl border border-border/70 bg-card p-3">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Best WPM
                  </div>
                  <div className="font-mono text-2xl font-bold text-primary tabular-nums">
                    {drillBestWpm.toFixed(0)}
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-card p-3">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Average WPM
                  </div>
                  <div className="font-mono text-2xl font-bold tabular-nums">
                    {drillAvgWpm.toFixed(0)}
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-card p-3">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Accuracy
                  </div>
                  <div className="font-mono text-2xl font-bold text-accent-foreground tabular-nums">
                    {drillAvgAccuracy.toFixed(0)}%
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-card p-3">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Drill Runs
                  </div>
                  <div className="font-mono text-2xl font-bold tabular-nums">
                    {filteredDrillHistory.length}
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-card p-3">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Trend
                  </div>
                  <div
                    className={`font-mono text-2xl font-bold tabular-nums ${
                      drillImprovement >= 0 ? "text-primary" : "text-destructive"
                    }`}
                  >
                    {drillImprovement > 0 ? "+" : ""}
                    {drillImprovement.toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Drill Progress Line Chart */}
              <div className="mt-5 h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={drillChartData}
                    margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
                  >
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="run"
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(val: unknown, name: unknown) => [
                        typeof val === "number" ? val : String(val),
                        name === "wpm" ? "WPM" : name === "accuracy" ? "Accuracy %" : String(name),
                      ]}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="wpm"
                      name="WPM"
                      stroke="var(--color-primary, var(--primary))"
                      strokeWidth={2.5}
                      dot={{ r: 2 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="accuracy"
                      name="Accuracy"
                      stroke="var(--color-accent, var(--accent))"
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Recent Drill Runs List */}
              <div className="mt-5">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Recent Drill Runs
                </div>
                <ul className="divide-y divide-border/70 text-sm">
                  {filteredDrillHistory.slice(0, 6).map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0 truncate text-muted-foreground flex items-center gap-2">
                        <span>
                          {new Date(h.date).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase font-mono tracking-wider text-foreground">
                          {h.difficulty}
                        </span>
                        <span className="rounded border border-border bg-secondary/70 px-1.5 py-0.5 text-[10px] font-mono text-primary font-semibold">
                          {h.mode ? (h.mode.endsWith("s") ? h.mode : `${h.mode}s`) : "30s"}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono tabular-nums text-xs sm:text-sm">
                        <strong className="text-primary font-semibold">{h.wpm.toFixed(0)}</strong>{" "}
                        wpm · <span className="text-foreground">{h.accuracy.toFixed(0)}% acc</span>{" "}
                        ·{" "}
                        <span className="text-muted-foreground text-xs">
                          {h.consistency.toFixed(0)}% sync
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* WORD SHOOTER PROGRESS VIEW ONLY                           */}
      {/* ========================================================= */}
      {mode === "shooter" && (
        <div className="mt-4">
          {/* Difficulty Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mr-1">
                Difficulty:
              </span>
              {DIFFICULTIES.map((diff) => {
                const active = shooterDifficulty === diff;
                return (
                  <button
                    key={diff}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setShooterDifficulty(diff)}
                    className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize transition-colors cursor-pointer ${
                      active
                        ? "bg-accent text-accent-foreground font-semibold"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {diff}
                  </button>
                );
              })}
            </div>
            <span className="text-xs font-mono text-muted-foreground">Arcade Mode Tracker</span>
          </div>

          {shooterAll.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              No Word Shooter games recorded yet. Launch Word Shooter to battle falling words!
            </p>
          ) : filteredShooterHistory.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              No games found matching the selected difficulty filter.
            </p>
          ) : (
            <>
              {/* Shooter KPI Cards */}
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
                <div className="rounded-xl border border-border/70 bg-card p-3">
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    <Trophy className="size-3 text-amber-500" />
                    High Score
                  </div>
                  <div className="font-mono text-2xl font-bold text-amber-500 tabular-nums">
                    {shooterHighScore.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-card p-3">
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    <Zap className="size-3 text-accent" />
                    Best Level
                  </div>
                  <div className="font-mono text-2xl font-bold text-accent-foreground tabular-nums">
                    Lvl {shooterBestLevel}
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-card p-3">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Average Score
                  </div>
                  <div className="font-mono text-2xl font-bold tabular-nums">
                    {Math.round(shooterAvgScore).toLocaleString()}
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-card p-3">
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    <Target className="size-3 text-primary" />
                    Accuracy
                  </div>
                  <div className="font-mono text-2xl font-bold text-primary tabular-nums">
                    {shooterAvgAccuracy.toFixed(0)}%
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-card p-3">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Games Played
                  </div>
                  <div className="font-mono text-2xl font-bold tabular-nums">
                    {filteredShooterHistory.length}
                  </div>
                </div>
              </div>

              {/* Shooter Score & Accuracy Line Chart */}
              <div className="mt-5 h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={shooterChartData}
                    margin={{ top: 8, right: 8, bottom: 0, left: -14 }}
                  >
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="game"
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(val: unknown, name: unknown) => [
                        typeof val === "number" ? val.toLocaleString() : String(val),
                        name === "score"
                          ? "Score"
                          : name === "accuracy"
                            ? "Accuracy %"
                            : String(name),
                      ]}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="score"
                      name="Score"
                      stroke="var(--color-primary, var(--primary))"
                      strokeWidth={2.5}
                      dot={{ r: 2 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="accuracy"
                      name="Accuracy"
                      stroke="var(--color-accent, var(--accent))"
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Recent Shooter Games List */}
              <div className="mt-5">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Recent Shooter Battles
                </div>
                <ul className="divide-y divide-border/70 text-sm">
                  {filteredShooterHistory.slice(0, 6).map((h) => {
                    const score = h.score ?? Math.round(h.wpm * 10);
                    const lvl = h.level ?? 1;
                    const words = h.wordsDestroyed ?? h.correct ?? 0;
                    return (
                      <li key={h.id} className="flex items-center justify-between gap-3 py-2">
                        <span className="min-w-0 truncate text-muted-foreground flex items-center gap-2">
                          <span>
                            {new Date(h.date).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase font-mono tracking-wider text-foreground">
                            {h.difficulty}
                          </span>
                          <span className="rounded border border-destructive/40 bg-destructive/15 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-destructive">
                            Lvl {lvl}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono tabular-nums text-xs sm:text-sm">
                          <strong className="text-amber-500 font-semibold">
                            {score.toLocaleString()}
                          </strong>{" "}
                          pts · <span className="text-foreground">{words} words</span> ·{" "}
                          <span className="text-muted-foreground text-xs">
                            {h.accuracy.toFixed(0)}% acc
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
