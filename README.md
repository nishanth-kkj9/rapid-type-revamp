# Typing Trainer Pro

Offline, browser-only typing practice app with no accounts or network tracking. The top navigation has **Practice**, **Learn**, **Arcade** (Word Shooter), **Stats**, and **Achievements**, plus **Settings**.

## Stack

- React 19, TypeScript (strict), Vite, Tailwind CSS v4
- Radix Dialog (`@radix-ui/react-dialog`), `cmdk`, `lucide-react`, `sonner`, Zod
- `vite-plugin-pwa` (Workbox offline cache) and self-hosted `@fontsource` fonts
- Vitest, Testing Library, and Playwright (`@axe-core/playwright`)

## Scripts

- `bun run dev`: start Vite dev server on port 3000
- `bun run build`: type-friendly production build to `dist/`
- `bun run preview`: preview `dist/` locally
- `bun run typecheck`: run `tsc --noEmit`
- `bun run lint`: run ESLint
- `bun run format:check`: check Prettier formatting
- `bun run test`: run Vitest unit and component tests
- `bun run test:e2e`: run Playwright end-to-end tests against `vite preview`

## File map

- `public/boot.js`: pre-paint theme, accent, and OpenDyslexic loader (`ttp:boot:v1`)
- `public/_headers`: strict Content-Security-Policy for Netlify/Cloudflare-style static hosts
- `src/App.tsx`: top-level mode routing, skip link, live announcer, and lazy screen imports
- `src/components/`: UI views (`DrillScreen`, `LearnScreen`, `ShooterScreen`, `StatsPage`, `AchievementsPage`, `SettingsPage`, `AppHeader`, charts, and keyboards)
- `src/hooks/`: `useAppStore`, `useTypingSession`, `useWordShooterGame`, `useCoarsePointer`
- `src/lib/`: deterministic generators, scoring (`typingStats`, `learn`, `shooterEngine`), storage (`storage`, `backup`, `bootPrefs`), and settings schemas

## How data is stored

- **IndexedDB (`typing-trainer-pro`, store `kv`)**:
  - Individual runs under `ttp:run:<id>` with an index in `ttp:history:index:v1` (legacy `ttp:history:v1` migrates on first load)
  - Key accuracy/speed stats (`ttp:keystats:v1`, `ttp:keybigrams:v1`, `ttp:keyspeed:v1`), missed words (`ttp:missed-words:v1`), and per-category best samples (`ttp:best:samples:v1:*`)
  - Learn progress (`ttp:learn:v1`), daily goal/streak (`ttp:daily:v1`), achievements (`ttp:achievements:v1`), custom texts (`ttp:custom-texts:v1`), and settings (`ttp:drill:settings:v1`, `ttp:shooter:settings:v1`, `ttp:uiprefs:v1`, `ttp:theme:v1`)
- **localStorage (`ttp:boot:v1`)**: mirrors only `{ theme, accent, dyslexiaFont }` for flash-free initial paint
- **Backup & wipe**: Settings -> Data & privacy exports/imports v2 JSON backups or clears all `ttp:*` records
