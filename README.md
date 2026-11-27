# Typing Trainer

Offline, browser-only typing practice app with no accounts or network tracking. The top navigation has **Practice**, **Learn**, and **Stats**, plus **Settings**.

## Stack

- React 19, TypeScript (strict), Vite, Tailwind CSS v4
- Radix Dialog (`@radix-ui/react-dialog`), `cmdk`, `lucide-react`, `sonner`, Zod
- `vite-plugin-pwa` (Workbox offline cache) and `@fontsource/jetbrains-mono` + `@fontsource/opendyslexic`
- Vitest, Testing Library, and Playwright (`@axe-core/playwright`)

## Scripts

- `bun run dev`: start Vite dev server on port 3000
- `bun run build`: production build to `dist/`
- `bun run preview`: preview `dist/` locally
- `bun run typecheck`: run `tsc --noEmit`
- `bun run lint`: run ESLint
- `bun run format:check`: check Prettier formatting
- `bun run test`: run Vitest unit and component tests
- `bun run test:e2e`: run Playwright end-to-end tests against `vite preview`

## File map

- `public/boot.js`: pre-paint theme and OpenDyslexic loader (`ttp:boot:v1`)
- `public/_headers`: Content-Security-Policy for static hosts
- `src/App.tsx`: top-level mode routing, skip link, live announcer, and lazy screen imports
- `src/components/`: UI views (`DrillScreen`, `LearnScreen`, `StatsPage`, `SettingsPage`, `AppHeader`, charts, and keyboards)
- `src/hooks/`: `useAppStore`, `useDrillController`, `useTypingSession`, `useDrillHotkeys`, `useCoarsePointer`
- `src/lib/`: deterministic text/lesson generators (`sentenceGenerator`, `quotes`, `learn`), scoring (`typingStats`, `daily`, `insights`), storage (`storage`, `backup`, `bootPrefs`), and settings schemas

## Storage

- **IndexedDB (`typing-trainer-pro`, store `kv`)**:
  - Runs under `ttp:run:<id>` with an index in `ttp:history:index:v1` (legacy `ttp:history:v1` migrates on first load)
  - Key stats (`ttp:keystats:v1`, `ttp:keybigrams:v1`, `ttp:keyspeed:v1`), missed words (`ttp:missed-words:v1`), and per-category best samples (`ttp:best:samples:v1:*`)
  - Learn progress (`ttp:learn:v1`), daily goal/streak (`ttp:daily:v1`), custom texts (`ttp:custom-texts:v1`), and settings (`ttp:drill:settings:v1`, `ttp:uiprefs:v1`, `ttp:theme:v1`)
- **localStorage (`ttp:boot:v1`)**: mirrors only `{ theme, dyslexiaFont }` for initial paint
- **Backup & wipe**: Settings -> Data exports/imports v2 JSON backups or clears all `ttp:*` records
