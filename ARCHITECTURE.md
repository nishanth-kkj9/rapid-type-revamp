# Architecture — Typing Trainer

## Purpose

Typing Trainer is an offline browser typing practice app built as a client-side Vite + React single-page application. Practice text generation, keystroke timing, metrics calculation, and daily streak tracking run deterministically in the browser with zero backend routes, zero external font CDNs, zero analytics, and zero external API calls.

## Runtime Architecture

```text
Browser
├── index.html + /public/boot.js (synchronous pre-paint boot)
│     Reads localStorage["ttp:boot:v1"] -> { theme, dyslexiaFont }
│     Fallback: OS prefers-contrast / prefers-color-scheme -> dark
│
├── src/main.tsx -> src/App.tsx
│     └── useAppStore()
│           ├── Hydrates from appStorage (IndexedDB via src/lib/storage.ts)
│           │     └── Runs migrateLegacyLocalStorage() before hydration
│           ├── Mirrors { theme, dyslexiaFont } -> ttp:boot:v1
│           ├── Practice view -> DrillScreen + useDrillController + useTypingSession
│           ├── Learn view -> LearnScreen + learn.ts
│           ├── Stats view -> StatsPage
│           └── Settings view -> SettingsPage (Typing, Keyboard, Appearance, Data)
│
└── Service Worker (vite-plugin-pwa + Workbox)
      Precaches app shell, /boot.js, icons, and @fontsource fonts (JetBrains Mono, OpenDyslexic)
```

## Persistence & Pre-Paint Boot

- **Primary store (`IndexedDB`)**: `src/lib/storage.ts` provides `IndexedDbStorage` (with a `MemoryStorage` fallback when IndexedDB is unavailable) behind the `Storage` interface. `src/lib/appHydration.ts` loads and validates all `ttp:*` keys with Zod schemas before populating React state.
- **Legacy migration**: On startup, `migrateLegacyLocalStorage()` migrates legacy `ttp:*` `localStorage` keys into `appStorage`. It retains legacy `ttp:theme:v1` and `ttp:uiprefs:v1` in `localStorage` until `ttp:boot:v1` has been written once, then cleans them up safely.
- **Pre-paint boot cache (`ttp:boot:v1`)**: `src/lib/bootPrefs.ts` mirrors `{ theme, dyslexiaFont }` into `localStorage` under `ttp:boot:v1` synchronously on theme/font changes, after hydration, and after backup import, and removes it on full data deletion. `/public/boot.js` runs synchronously in `<head>` to apply theme classes, `theme-color`, and OpenDyslexic attributes before first paint.

## Source Layout

- **`src/hooks/`**
  - `useAppStore.ts` — Central application store hydrated from IndexedDB, managing URL query state (`?mode=drill|learn|stats|settings`), settings updates, run commits, full backup import/export, and complete data deletion.
  - `useDrillController.ts` & `useDrillHotkeys.ts` — Practice mode passage generation, ghost pace caret, audio triggers, and keyboard restart shortcuts.
  - `useTypingSession.ts` — Pure reducer state machine (`idle -> running -> finished`) tracking keystroke accuracy, uncorrected errors, per-second monotonic samples, mistake maps, key bigrams, inter-key latencies, missed words, and slow words.

- **`src/lib/` (Pure, framework-free domain modules + unit tests)**
  - `typingStats.ts` — WPM, Raw WPM, Adjusted WPM, keystroke-level accuracy, rolling 5-second WPM consistency, per-type personal best aggregation, history storage (`loadHistoryFromStorage`, `saveRunToStorage`, `importHistoryToStorage`), and `MAX_IMPORT_RUNS`.
  - `sentenceGenerator.ts` / `quotes.ts` / `wordLists.json` — Local Common 200 and Common 1000 word lists, non-repeating quote shuffle, and weak-key/slow-key/missed-word practice generators.
  - `learn.ts` — Progressive 26-letter curriculum (`LETTER_ORDER`), per-key EMA speed and accuracy thresholds, and real-words-first lesson generation with bigram pseudo-word fallback.
  - `daily.ts` — Daily active-minutes practice goal (`1..120m`, default `5m`) and UTC calendar streak tracking.
  - `insights.ts` — Post-run feedback comparing accuracy, slowest key, consistency, and recent same-type runs.
  - `backup.ts` & `historyExport.ts` — Schema v2 full-app JSON backup export, merge-import (with v1 history fallback), CSV export, and `clearAllAppData()`.
  - `shareResult.ts` — Plain-text run summary formatter and clipboard copy helper (`formatResultShareText`, `copyResultText`).
  - `keyboardLayout.ts` — ANSI/ISO key matrices across QWERTY, Dvorak, Colemak, QWERTZ, and AZERTY layouts with finger-zone mapping.

- **`src/components/`**
  - Top-level screens (`DrillScreen.tsx`, `LearnScreen.tsx`, `StatsPage.tsx`, `SettingsPage.tsx`), settings sections (`src/components/settings/*`), charts (`src/components/charts/*`), `AppHeader.tsx`, `CommandPalette.tsx`, and keyboards (`Keyboard.tsx`, `CompactTouchKeyboard.tsx`).

## Data Flows

### Practice Run Commit

1. First printable keystroke transitions `useTypingSession` from `idle` to `running`.
2. Keystrokes update accuracy counters, expected-key mistake maps, inter-key latencies, and rolling samples.
3. On completion or time expiry (`finished`), `ResultsPanel` displays metrics, `buildInsight` feedback, and clipboard copy (`copyResultText`).
4. `useAppStore.commitDrillRun()` writes history (including mode, difficulty, `punctuation`, `numbers`, and `quoteLength`), key errors, bigrams, key latencies, missed words, and daily active minutes to `appStorage`.

### Backup Import & Data Wipe

1. JSON input is parsed (`try/catch`), checked against `MAX_IMPORT_RUNS`, and validated with Zod schemas (`BackupV2EnvelopeSchema` or v1 history fallback).
2. Rejection returns explicit failure reasons (`invalid`, `too-many-runs`, or `quota`).
3. Valid backups merge records into `appStorage`, rehydrate application state, and refresh `ttp:boot:v1`.
4. Deleting all data (`clearAllAppData`) removes all `ttp:*` keys from IndexedDB and `localStorage` including `ttp:boot:v1`, then resets state cleanly.

## Privacy & Security Boundaries

- All data stays locally in the browser; imported JSON backups are validated with strict Zod bounds (`MAX_IMPORT_RUNS`, field ranges, string length caps) before storage.
- No telemetry, third-party scripts, CDN stylesheets, or runtime API keys exist anywhere in the client bundle.
