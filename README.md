# Typing Trainer Pro

A fast, keyboard-first typing trainer for the web. Practice speed and accuracy through timed drills with live feedback, a highlighted virtual keyboard, mistake analysis, per-second WPM charts, and local progress history.

This is the web rebuild of the original [Typing Trainer Pro](https://github.com/nishanth-kkj9/typing-trainer-pro) Python/PyQt desktop application. The core sentence-generation and typing-statistics ideas have been ported to TypeScript and adapted for the browser.

## ✨ Features

- **Timed typing tests** — choose 15, 30, 60, or 120 seconds.
- **Three difficulty levels** — Easy, Medium, and Hard passages generated from difficulty-specific word pools and sentence templates.
- **Live performance stats** — WPM, raw WPM, net WPM, accuracy, errors, remaining time, consistency, and run progress.
- **Per-second WPM chart** — visualizes your speed over the course of each run.
- **Visual typing feedback** — typed characters are marked correct or incorrect; the caret shows your current position and auto-scrolls.
- **Interactive virtual keyboard** — highlights the next key to press (including Shift), flashes the last pressed key, and pulses on errors.
- **Problem-key analysis** — ranks the characters you miss most often after each run.
- **Fair-play input guard** — rejects paste, drag-and-drop, and context-menu-style input so ordinary runs stay fair. This is a client-side UX control, not a tamper-proof security boundary.
- **Endless passages** — new text is generated automatically before you reach the end of a run.
- **Personal progress tracking** — best WPM, average WPM, run count, accuracy history, and recent runs.
- **Local-first history** — run history is stored in browser `localStorage`; no backend or account required.
- **Import / export history** — back up or restore your progress as JSON.
- **Personal-best detection** — completed runs are compared against your previous best WPM and celebrated with a glow.
- **Mistake shake** — the typing panel shakes on incorrect input for immediate tactile feedback.
- **Command palette** — press `Ctrl+K` (or `⌘+K`) to change difficulty, duration, or restart without leaving the keyboard.
- **Keyboard shortcuts** — `Esc` restarts a run; `Ctrl/⌘+K` opens the command palette.
- **Responsive, terminal-style UI** — designed for desktop and smaller screens with a focused dark interface.

> **Game mode status:** `src/components/WordShooter.tsx` contains a separate falling-word game implementation, but it is currently **not mounted by the active route**. Treat it as an integration-ready component rather than an active user-facing feature until a game-mode route/toggle is wired up.

## 📊 Performance metrics

| Metric          | Calculation                                                   |
| --------------- | ------------------------------------------------------------- |
| **WPM**         | Correct characters ÷ 5 ÷ elapsed minutes                      |
| **Raw WPM**     | Total typed characters ÷ 5 ÷ elapsed minutes                  |
| **Net WPM**     | (Correct characters − errors × penalty) ÷ 5 ÷ elapsed minutes |
| **Accuracy**    | Correct characters ÷ total typed characters × 100             |
| **Consistency** | `100 − coefficient of variation × 100`, clamped to 0–100      |

A completed run records correct characters, errors, total typed characters, elapsed time, difficulty, duration mode, per-second character samples, and a mistake map.

## 🧠 How the trainer works

1. Select a **difficulty** and **test duration**.
2. The app generates a passage from its local word pools and sentence templates.
3. Start typing — the high-precision timer begins with your first input.
4. The app compares each entered character with the expected character and updates live statistics.
5. The virtual keyboard indicates the next key and required Shift modifier.
6. When the timer reaches zero, the run is saved locally and the results screen shows your performance, problem keys, and WPM chart.
7. Continue practicing to build your local history and improve your personal best.

## 🗂️ Project structure

```text
src/
├── components/
│   ├── CommandPalette.tsx     Ctrl/⌘+K command palette
│   ├── HistoryPanel.tsx       Progress summary, chart, import/export, and recent runs
│   ├── Keyboard.tsx           Virtual keyboard with next-key and pressed-key feedback
│   ├── ProblemKeys.tsx        Most-missed character analysis
│   ├── StatCard.tsx           Live statistic cards
│   ├── TypingText.tsx         Per-character typing feedback and caret
│   ├── WordShooter.tsx        Falling-word game component; not currently mounted
│   └── WpmChart.tsx           Per-second WPM line chart
├── hooks/
│   └── use-mobile.tsx         Responsive viewport helper
├── lib/
│   ├── sentenceGenerator.ts   Difficulty-aware passage generation
│   ├── typingStats.ts         WPM, accuracy, consistency, history, import/export
│   ├── error-capture.ts       SSR/runtime error capture
│   ├── error-page.ts          User-facing error page renderer
│   └── mcp/                    MCP server registry and tools
├── routes/
│   ├── __root.tsx              Root layout, metadata, and error handling
│   ├── index.tsx               Main typing trainer screen
│   ├── mcp.ts                  MCP transport route (generated)
│   └── [.well-known]/          MCP resource metadata (generated)
├── server.ts                   SSR server wrapper
└── styles.css                  Global application styles and animations

.github/workflows/ci.yml        CI verification pipeline
package.json                    Scripts and dependencies
vite.config.ts                  TanStack Start/Vite configuration
ARCHITECTURE.md                 Runtime and source architecture guide
AUDIT.md                        Repository and security audit
LICENSE                         MIT License
```

## 🛠️ Tech stack

- **React 19** — UI
- **TypeScript** — application logic and type safety
- **TanStack Start / TanStack Router** — routing and application framework
- **Vite** — development server and build tooling
- **Tailwind CSS v4** — styling
- **Radix UI** — accessible UI primitives
- **cmdk** — command palette
- **Lucide React** — icons
- **Recharts** — WPM visualization
- **Zod** — runtime input/data validation
- **localStorage** — client-side typing history
- **Lovable MCP SDK** — MCP endpoint and tool integration

## 🚀 Getting started

### Prerequisites

- Node.js
- npm, yarn, pnpm, or bun
- Git

### Clone the repository

```bash
git clone https://github.com/nishanth-kkj9/rapid-type-revamp.git
cd rapid-type-revamp
```

### Install dependencies

```bash
npm install
```

The repository also includes `bun.lock` and CI uses Bun. For reproducible CI-style installs, use Bun and its frozen lockfile:

```bash
bun install --frozen-lockfile
```

### Start the development server

```bash
npm run dev
```

Open the local URL shown by Vite in your browser.

### Create a production build

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

### Lint the project

```bash
npm run lint
```

### Typecheck

```bash
npm run typecheck
```

### Run tests

```bash
npm run test
```

### Check formatting

```bash
npm run format:check
```

## ⌨️ Keyboard shortcuts

| Shortcut         | Action                   |
| ---------------- | ------------------------ |
| `Esc`            | Restart the current test |
| `Ctrl+K` / `⌘+K` | Open the command palette |

## 🚢 Deployment and MCP security

The app ships an MCP endpoint at `/mcp`, plus its discovery document at
`/.well-known/oauth-protected-resource`.

The current MCP manifest declares **no authentication** and exposes read-only tools. If `/mcp` is reachable from the public internet, protect it with edge rate limiting and/or an access-control layer when public anonymous use is not intended.

The generated MCP routes use:

```ts
trustForwardedHost: true,
trustForwardedProto: true,
```

That is only safe when the deployment proxy is trusted to overwrite `X-Forwarded-Host` and `X-Forwarded-Proto` correctly, as expected by the Lovable deployment setup. **Before deploying elsewhere** (custom reverse proxy, self-hosted worker, another platform), set both flags to `false` or scope trust to the proxy you actually control.

Both generated files carry an ownership banner. Take ownership before editing so the generator does not overwrite your changes:

- `src/routes/mcp.ts`
- `src/routes/[.well-known]/oauth-protected-resource.ts`

Never run `vite dev --host` on a network-exposed machine without appropriate firewall/access controls.

For the complete repository audit, see [`AUDIT.md`](AUDIT.md). For the source/runtime architecture, see [`ARCHITECTURE.md`](ARCHITECTURE.md).

## 🔒 Privacy and data boundaries

Typing performance history is stored in the browser using `localStorage`. The application does not require a typing-data backend or account to record runs locally.

Because the history is browser-local, clearing site data or browser storage can remove saved results. Use the **Export history** button to back up your progress.

Local history, personal-best values, and the anti-paste typing guard are browser-side controls. They should not be treated as authoritative evidence for competitive scoring.

## 🧪 Current scope

The active product is intentionally focused on fast typing practice rather than accounts, leaderboards, or server-side analytics. The main experience is a single-page trainer with local progress tracking.

MCP currently provides two read-only capabilities:

- `generate_passage` — generate a practice passage.
- `analyze_typing` — calculate typing statistics and problem keys for supplied text.

## 🗺️ Possible future improvements

- Integrate `WordShooter` through an explicit game-mode route/toggle.
- User accounts and optional cloud synchronization.
- Custom text and user-created practice lists.
- More detailed performance analytics.
- Keyboard heatmaps and long-term weak-key trends.
- Additional test modes and challenge formats.
- Global or friend leaderboards with server-side validation.

## 🤝 Development notes

This repository is connected to [Lovable](https://lovable.dev). Changes pushed to the connected branch can sync back to the Lovable project. Avoid rewriting published Git history such as force-pushing, rebasing, amending, or squashing already-pushed commits.

The project uses generated TanStack/Lovable route files. Follow the generator ownership comments before making persistent manual changes to generated files.

## 📚 Maintainer documentation

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — runtime, data flow, source ownership, and extension points.
- [`AUDIT.md`](AUDIT.md) — source audit, security/deployment findings, verification posture, and priority backlog.

## 📄 License

This project is licensed under the [MIT License](LICENSE).

## 🔗 Related project

- [Typing Trainer Pro — original Python/PyQt version](https://github.com/nishanth-kkj9/typing-trainer-pro)
