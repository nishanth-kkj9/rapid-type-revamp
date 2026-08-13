# Typing Trainer Pro

A fast, keyboard-first typing trainer for the web. Timed drills with live WPM,
accuracy, consistency, a highlighted virtual keyboard and local progress tracking.

Web rebuild of the original [typing-trainer-pro](https://github.com/nishanth-kkj9/typing-trainer-pro)
Python/PyQt desktop app — same sentence generator and stats logic, ported to TypeScript.

## Features

- **Timed tests** — 15s, 30s, 60s and 120s runs with a live countdown and progress bar.
- **Three difficulties** — easy, medium and hard word pools plus grammar templates, so
  no two passages repeat.
- **Live stats** — WPM, raw WPM, accuracy, error count and consistency updated as you type.
- **Virtual keyboard** — highlights the next key (with Shift), flashes red on a mistake and
  shows the key you just pressed.
- **Problem keys** — after each run, the characters you missed most, ranked.
- **Endless text** — the passage extends itself so you never run out mid-run.
- **Progress tracking** — best/average WPM, a run chart and recent history, saved in
  your browser via `localStorage`. Personal bests are called out.
- **Shortcuts** — `Esc` or `Tab` restarts instantly from anywhere.

## How it works

| Metric | Formula |
| --- | --- |
| WPM | correct characters ÷ 5 ÷ minutes elapsed |
| Raw WPM | all typed characters ÷ 5 ÷ minutes elapsed |
| Accuracy | correct ÷ total typed × 100 |
| Consistency | 100 − coefficient of variation of per-second typing speed |

Nothing is sent to a server — every run stays in your browser.

## Project structure

```text
src/
  lib/sentenceGenerator.ts   word pools + templates, difficulty-aware passages
  lib/typingStats.ts         WPM / accuracy / consistency + localStorage history
  components/TypingText.tsx  per-character feedback and caret
  components/Keyboard.tsx    virtual keyboard with next-key highlighting
  components/StatCard.tsx    stat tiles
  components/HistoryPanel.tsx best/average, chart and recent runs
  components/ProblemKeys.tsx most-missed characters
  routes/index.tsx           the trainer screen
```

Built with TanStack Start (React 19), Vite and Tailwind CSS v4.

## Development

Requires Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

The app runs at `http://localhost:8080`.

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b5faee97-0ff9-43b3-b63a-cf04c3d92a9d).
Every change made in Lovable is committed straight to this repository, and pushes to
`main` on GitHub sync back into Lovable.
