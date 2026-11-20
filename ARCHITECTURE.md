# Architecture — Typing Trainer Pro

## Purpose

Typing Trainer Pro is a local-first, offline-capable typing trainer and arcade game implemented as a client-side Vite + React single-page application. All practice generation, keystroke timing, metrics computation, achievements, daily streak tracking, and Word Shooter physics execute deterministically in the browser with zero backend routes, zero external font CDNs, zero analytics, and zero external API calls.

## Runtime Architecture

```text
Browser
├── index.html + /public/boot.js (synchronous pre-paint boot)
│     Reads localStorage["ttp:boot:v1"] -> { theme, accent, dyslexiaFont }
│     Fallback: OS prefers-contrast / prefers-color-scheme -> dark
│
├── src/main.tsx -> src/App.tsx
│     └── useAppStore()
│           ├── Hydrates from appStorage (IndexedDB via src/lib/storage.ts)
│           │     └── Runs migrateLegacyLocalStorage() before hydration
│           ├── Mirrors { theme, accent, dyslexiaFont } -> ttp:boot:v1
│           ├── Practice view -> DrillScreen + useTypingSession (idle -> running -> finished)
│           ├── Word Shooter view -> ShooterScreen + useWordShooterGame + shooterEngine.ts
│           ├── Achievements view -> AchievementsScreen
│           └── Settings view -> SettingsScreen (7 unified tabs)
│
└── Service Worker (vite-plugin-pwa + Workbox)
      Precaches app shell, /boot.js, icons, and self-hosted @fontsource fonts
```

## Persistence & Pre-Paint Boot

- **Primary store (`IndexedDB`)**: `src/lib/storage.ts` provides `IndexedDbStorage` (with an in-memory fallback when IndexedDB is unavailable) behind the `Storage` interface. `src/lib/appHydration.ts` loads and validates all `ttp:*` keys with Zod schemas before populating React state.
- **Legacy migration**: On startup, `migrateLegacyLocalStorage()` migrates legacy `ttp:*` `localStorage` keys into `appStorage`. It retains legacy `ttp:theme:v1` and `ttp:uiprefs:v1` in `localStorage` until `ttp:boot:v1` has been written once, then cleans them up safely.
- **Pre-paint boot cache (`ttp:boot:v1`)**: `src/lib/bootPrefs.ts` mirrors only `{ theme, accent, dyslexiaFont }` into `localStorage` under `ttp:boot:v1` synchronously on theme/accent/font changes, after hydration, and after backup import, and removes it on full data deletion. `/public/boot.js` runs synchronously in `<head>` to apply theme classes, `theme-color`, accent, and OpenDyslexic attributes before first paint.

## Source Layout

- **`src/hooks/`**
  - `useAppStore.ts` — Central application store hydrated from IndexedDB, managing URL query state (`?mode=drill|shooter|achievements|settings`), settings updates, run commits, full backup import/export, and complete data deletion.
  - `useTypingSession.ts` — Pure reducer state machine (`idle -> running -> finished`) tracking per-keystroke accuracy, uncorrected errors, per-second monotonic samples, mistake maps, key bigrams, inter-key latencies, missed words, and slow words.
  - `useWordShooterGame.ts` — Bridges `requestAnimationFrame` canvas loop and keyboard events to `shooterEngine.ts`.

- **`src/lib/` (Pure, framework-free domain modules + unit tests)**
  - `typingStats.ts` — WPM, Raw WPM, Adjusted WPM, keystroke-level accuracy, rolling 5-second WPM consistency, history storage (`loadHistoryFromStorage`, `saveRunToStorage`, `importHistoryToStorage`), and `MAX_IMPORT_RUNS`.
  - `sentenceGenerator.ts` / `grammarPools.ts` / `quotes.ts` — Local vocabulary pools (`WORD_LISTS`), grammar-structured sentence builder, non-repeating quote shuffle, and weak-key/slow-key remediation passage generation.
  - `daily.ts` — Daily practice goals (active minutes or completed runs) with same-day streak updates, UTC calendar date math, and optional 7-day cooldown streak freeze.
  - `achievements.ts` — Deterministic achievement evaluator and progress selectors (`ACHIEVEMENTS`).
  - `backup.ts` — Schema v2 full-app JSON backup export, merge-import (with v1 history fallback), shared `MAX_IMPORT_RUNS` validation, and `clearAllAppData()`.
  - `shareResult.ts` — Text summary formatter and HTML Canvas PNG card renderer that waits for self-hosted `Space Grotesk` and `JetBrains Mono` fonts via `document.fonts.load`.
  - `keyboardLayout.ts` — ANSI/ISO key matrices across QWERTY, Dvorak, Colemak, QWERTZ, and AZERTY layouts with finger-zone mapping.
  - `shooterEngine.ts` — Deterministic Word Shooter simulation step, difficulty ramp, streak abilities, and boss waves.

- **`src/components/`**
  - Top-level screens (`DrillScreen.tsx`, `ShooterScreen.tsx`, `AchievementsScreen.tsx`, `SettingsScreen.tsx`) and focused sub-components under `src/components/settings/` and `src/components/charts/`.

## Data Flows

### Practice Run Commit

1. First printable keystroke dispatches transition from `idle` to `running` in `useTypingSession`.
2. Every keystroke updates keystroke accuracy counters, expected-key mistake maps, inter-key latency (capped for pauses), and rolling samples.
3. On completion or time expiry (`finished`), `ResultsPanel` computes metrics, coaching guidance, and optional PNG share card.
4. `useAppStore.commitDrillRun()` writes history, key errors, bigrams, key latencies, spaced-repetition missed words, daily progress, and achievement state to `appStorage`.

### Backup Import & Data Wipe

1. JSON input is parsed cleanly (`try/catch`), checked against `MAX_IMPORT_RUNS`, and validated with Zod schemas (`BackupV2EnvelopeSchema` or v1 history fallback).
2. Rejection returns explicit failure reasons (`invalid`, `too-many-runs`, or `quota`).
3. Valid backups merge records into `appStorage`, rehydrate application state, and refresh `ttp:boot:v1`.
4. Deleting all data (`clearAllAppData`) removes all `ttp:*` keys from IndexedDB and `localStorage` including `ttp:boot:v1`, then resets state cleanly.

## Privacy & Security Boundaries

- All data lives locally in the browser; imported JSON backups are treated as untrusted input and validated with strict Zod bounds (`MAX_IMPORT_RUNS`, field ranges, string length caps) before storage.
- No telemetry, third-party scripts, CDN stylesheets, or runtime API keys exist anywhere in the client bundle.
