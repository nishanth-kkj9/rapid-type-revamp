# Typing Trainer Pro

A fast, local-first typing trainer and arcade game built as a single-page React web application. All practice sessions, keystroke statistics, custom passages, achievements, and preferences stay strictly inside your browser with offline PWA support, self-hosted fonts, and zero external requests or tracking.

## Features

- **Flexible Practice Modes**
  - **Time Drills**: 15s, 30s, 60s, or 120s endless passages with seamless generation.
  - **Word Quota Drills**: 10, 25, 50, or 100 words using frequency-ranked word pools or grammatical sentences.
  - **Literary Quotes**: Curated short, medium, and long quotes with attribution and non-repeating shuffle.
  - **Custom Practice Lists**: Paste articles, notes, or code snippets into saved local lists.
- **Difficulty & Character Mix**: Easy, Medium, and Hard vocabulary tiers with independent **Sentences vs. Words**, **Punctuation**, **Numbers**, and **Capitals** toggles.
- **Targeted Remediation Drills**: Detects high-error keys, slow inter-key latencies (ms), weak bigrams, and missed words (with multi-run graduation) to build focused practice passages deterministically.
- **Word Shooter Arcade**: Canvas-powered falling-word arcade game (`requestAnimationFrame`) with difficulty presets, adjustable speed multiplier, lives / Practice mode, Daily Seeded Challenge, streak abilities (Slow-Time & Shield), and multi-target Boss Waves.
- **Interactive Virtual Keyboard & Heatmap**: Supports **QWERTY**, **Dvorak**, **Colemak**, **QWERTZ**, and **AZERTY** across **ANSI (US)** and **ISO (EU)** standards, plus finger-zone color guides and a lifetime per-key accuracy & speed heatmap.
- **Unified Settings & Command Palette (`Ctrl/⌘ + K`)**: Single 7-tab Settings view (`Typing`, `Practice content`, `Keyboard`, `Sound`, `Game`, `Appearance`, `Data & privacy`) plus searchable workspace and configuration commands.
- **Accessibility (WCAG 2.2 AA / AAA)**: Dark, Light, and **High-Contrast** themes with zero-flash pre-paint boot, self-hosted **OpenDyslexic** font option, keyboard-operable charts with toggleable data tables, `aria-live` announcements, and reduced-motion support.
- **Offline PWA & Full Backups**: Installable Progressive Web App with precached assets and self-hosted fonts (`@fontsource/jetbrains-mono`, `@fontsource/space-grotesk`, `@fontsource/opendyslexic`), IndexedDB persistence, full-backup JSON export/import, and one-click data wipe.

## Performance Metrics

| Metric                         | Formula                                                                                                                                        |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **WPM**                        | `correctFinalChars / 5 / elapsedMinutes`                                                                                                       |
| **Raw WPM**                    | `totalKeystrokes / 5 / elapsedMinutes`                                                                                                         |
| **Net / Adjusted WPM**         | `max(0, correctFinalChars - uncorrectedErrors) / 5 / elapsedMinutes`                                                                           |
| **Accuracy (Keystroke-Level)** | `correctKeystrokes / totalKeystrokes × 100` (mistakes count even if later corrected with Backspace; `uncorrectedErrors` is tracked separately) |
| **Consistency**                | `clamp(0, 100, 100 − coefficientOfVariation(rollingSampleWpm) × 100)` across monotonic per-second net-progress samples                         |

## Architecture & Project Structure

```text
public/
└── boot.js                    Pre-paint theme, accent & OpenDyslexic initializer (ttp:boot:v1)
src/
├── components/
│   ├── settings/              Unified 7-tab Settings sub-views
│   ├── charts/                Accessible SVG LineChart, tooltip, axes & data table
│   ├── ui/                    Radix Dialog, Command Palette (cmdk), Sonner toasts
│   ├── AppHeader.tsx          Primary navigation (Practice, Word Shooter, Achievements), offline/install controls & theme toggle
│   ├── DrillScreen.tsx        Practice drill UI, stat cards, keyboard & results panel
│   ├── ShooterScreen.tsx      Word Shooter canvas game & arcade progress summary
│   ├── HistoryPanel.tsx       Expandable run history, filters, progress chart & backup controls
│   └── TypingText.tsx         Cached-rect high-contrast passage renderer
├── hooks/
│   ├── useAppStore.ts         Central IndexedDB-hydrated application state & actions
│   ├── useTypingSession.ts    Pure reducer state machine (idle -> running -> finished)
│   └── useWordShooterGame.ts  Canvas animation loop & shooter state bridge
└── lib/
    ├── bootPrefs.ts           Synchronous ttp:boot:v1 localStorage mirror helper
    ├── typingStats.ts         Keystroke accuracy, rolling WPM, consistency & history storage
    ├── sentenceGenerator.ts   Grammatical sentence builder, word streams & remediation drills
    ├── shooterEngine.ts       Framework-free Word Shooter simulation engine
    ├── daily.ts               Configurable active-minutes / runs daily goals & weekly freeze streaks
    ├── backup.ts              Full v2 JSON backup export, merge-import & complete data wipe
    ├── shareResult.ts         Canvas PNG result card & text summary generator
    └── storage.ts             IndexedDB + localStorage persistence adapter & legacy migration
```

## Tech Stack

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS v4**
- **Radix UI** (`@radix-ui/react-dialog`) & **cmdk**
- **Zod** for storage/backup schema validation
- **Lucide React** & **Sonner**
- **vite-plugin-pwa** (Workbox offline precaching)
- **Vitest**, **Testing Library**, & **Playwright**

## Scripts

```bash
npm install        # Install dependencies
npm run dev        # Start local Vite dev server on port 3000
npm run build      # Build production PWA bundle into dist/
npm run preview    # Preview the built production bundle locally
npm run typecheck  # Run TypeScript strict type checking
npm run lint       # Run ESLint & Prettier checks
npm run test       # Run Vitest unit & Testing Library integration tests
npm run test:e2e   # Run Playwright end-to-end tests against production preview
```

## Privacy, Security Headers & Local Storage

Typing Trainer Pro runs 100% locally in your browser with zero accounts, zero analytics, and zero third-party network requests. All run history (`ttp:run:<id>` + `ttp:history:index:v1`), key heatmaps, Learn progress, custom passages, goals, and preferences are persisted in IndexedDB (with `ttp:boot:v1` pre-paint boot cache in `localStorage`) under `ttp:*` keys and can be exported or permanently erased at any time in **Settings → Data & privacy**.

`public/_headers` configures a strict `Content-Security-Policy` and security headers; note that `_headers` only applies on Netlify/Cloudflare Pages–style static hosts (when deploying elsewhere, configure the equivalent response headers in your web server or CDN).

## License

[MIT License](LICENSE)
