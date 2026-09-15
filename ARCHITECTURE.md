# Architecture — Rapid Type Revamp

## Purpose

Rapid Type Revamp is a browser-first typing trainer. The normal typing experience does not require an application database or account: practice content is generated locally, typing is evaluated in the browser, and run history is persisted in `localStorage`.

The application also exposes a small MCP endpoint for passage generation and typing analysis.

## Runtime architecture

```text
                         ┌──────────────────────────┐
                         │        Browser            │
                         │                          │
                         │  React + TanStack Start  │
                         │          route: /        │
                         │            │             │
                         │    ┌───────┴────────┐    │
                         │    │ typing state   │    │
                         │    │ timer/input    │    │
                         │    └───────┬────────┘    │
                         │            │             │
                         │     ┌──────┴──────┐      │
                         │     │ core libs   │      │
                         │     │ stats/text  │      │
                         │     └──────┬──────┘      │
                         │            │             │
                         │       localStorage      │
                         └──────────────────────────┘

External MCP client
        │
        ▼
      /mcp
        │
        ├── generate_passage
        └── analyze_typing

Deployment/runtime
        │
        ├── Vite
        ├── TanStack Start / Router
        ├── Nitro target from Lovable config
        └── src/server.ts SSR error wrapper
```

## Source layout

### `src/routes/index.tsx`

Primary application route. Owns the typing-session state machine, timing lifecycle, keyboard/input behavior, result presentation, history integration, and command-palette wiring.

Important state includes:

- selected `difficulty`
- selected `duration`
- generated `text`
- `typed` input
- `running` / `finished`
- elapsed time
- correct/incorrect counters
- mistakes map
- per-second samples
- loaded history

The route uses `requestAnimationFrame` with `performance.now()` for the session timer and throttles visible timer state to roughly 10 Hz.

### `src/components/`

Presentation and interaction components:

- `TypingText.tsx` — per-character feedback and caret.
- `Keyboard.tsx` — virtual keyboard and key-state visuals.
- `HistoryPanel.tsx` — local progress and import/export UI.
- `ProblemKeys.tsx` — most-missed expected characters.
- `WpmChart.tsx` — per-second chart.
- `StatCard.tsx` — statistics display.
- `CommandPalette.tsx` — keyboard-first session controls.
- `WordShooter.tsx` — separate falling-word game implementation; currently not mounted by `src/routes/index.tsx`.

### `src/lib/sentenceGenerator.ts`

Pure local passage generation. Difficulty selects separate vocabulary pools and templates. The generator avoids recent sentence duplication and returns text without network calls.

Because this module is pure and server-safe, it is shared by both the browser trainer and the MCP `generate_passage` tool.

### `src/lib/typingStats.ts`

Core statistics and local-history layer.

Responsibilities:

- WPM/raw WPM/net WPM calculations.
- Accuracy and consistency calculation.
- Cumulative-sample conversion to per-second deltas.
- Versioned history storage.
- Legacy history migration.
- Import/export.
- Run ID generation.

The history schema is parsed with Zod before imported data is accepted.

### `src/lib/mcp/`

MCP tool registry and implementations.

Current tools:

```text
 generate_passage
     difficulty + minChars
             │
             ▼
     generatePassage()

 analyze_typing
     target + typed + elapsedSeconds
     + optional perSecondCorrect
             │
             ▼
     computeStats() + mistake analysis
```

The tools are annotated read-only and have `openWorldHint: false`.

### `src/routes/mcp.ts`

Auto-generated MCP route. Do not manually modify it while the generator banner remains in place. The route currently uses forwarded host/protocol trust expected by the Lovable deployment setup.

### `src/routes/[.well-known]/oauth-protected-resource.ts`

Auto-generated MCP resource metadata/discovery route. It shares the forwarded-header deployment considerations of `/mcp`.

### `src/server.ts`

Custom TanStack Start server entry. It loads the framework server entry and normalizes a specific class of h3-swallowed SSR failures into the project's HTML error page.

### `.github/workflows/ci.yml`

Verification pipeline:

```text
Lint ───────────┐
Format ─────────┤
Typecheck ──────┤
Tests ──────────┤──> verify ──> final CI gate
Build ──────────┘

Dependency audit ──> report-only
```

The workflow installs with a frozen Bun lockfile and gives the workflow only `contents: read` permissions.

## Data flow: normal typing run

```text
1. Route mounts
2. loadHistory() reads ttp:history:v1
3. generatePassage() creates the initial passage
4. First typing change starts the high-resolution timer
5. Every change is reconciled against the expected passage
6. Counters + mistakes + pressed-key state are updated
7. Per-second correct counts feed the chart/consistency calculation
8. At time expiry, final stats are frozen
9. The run is stored in localStorage
10. The results view reads the frozen snapshot
```

The route also appends more generated text when the user approaches the end of the current passage.

## Data flow: history import

```text
File/text input
      │
      ▼
JSON.parse
      │
      ▼
Zod array schema
      │
      ├── invalid → reject
      │
      └── valid → merge by id
                         │
                         ▼
                 newest-first, max 100
                         │
                         ▼
                  localStorage
```

The import is local-only. There is no server-side history synchronization in the current architecture.

## Data flow: MCP request

```text
MCP client
   │
   ▼
/mcp
   │
   ▼
Lovable MCP handler
   │
   ├── validate request with Zod
   │
   ├── generate_passage
   │       └── local sentence generation
   │
   └── analyze_typing
           ├── compare target vs typed
           ├── compute stats
           └── calculate problem keys
```

The current manifest declares MCP authentication as `none`. Treat the endpoint as a public service unless the deployment layer restricts it.

## Security boundaries

The browser is an untrusted environment. Local history and fair-play controls can be modified by the user.

Security-sensitive deployment assumptions live outside the React UI:

- `/mcp` exposure and rate limiting.
- Reverse-proxy handling of `X-Forwarded-Host` and `X-Forwarded-Proto`.
- HTTPS/TLS termination.
- Security headers and edge access policies.

The anti-paste guard, hidden typing input, and local best-score storage are UX/fairness mechanisms, not trusted security controls.

## Current integration gap

`WordShooter.tsx` is present as a complete component, but the root route currently does not import or mount it. This means the repository contains game code that is not reachable from the active product flow.

When integrating it, prefer an explicit game-mode state or route rather than conditionally mounting a large game tree from unrelated typing-session state. Add user-flow tests after integration so the game cannot silently regress to an unreachable state.

## Architectural invariants

1. Passage generation remains deterministic in shape and local; no network dependency is required for ordinary typing.
2. History writes stay browser-local until cloud sync is deliberately introduced.
3. Imported history is never accepted without schema validation.
4. MCP tools remain read-only unless a future design explicitly changes their contract.
5. The browser is never treated as an authoritative source for competitive scoring.
6. Auto-generated Lovable files are not hand-edited without taking ownership according to the generator instructions.

## Recommended extension points

For future development, keep these concerns separate:

- **Game/session state:** route or dedicated hook.
- **Scoring/statistics:** `src/lib/typingStats.ts` and pure helpers.
- **Passage generation:** `src/lib/sentenceGenerator.ts`.
- **Persistence:** a dedicated storage adapter so `localStorage` can later be replaced or supplemented without rewriting UI components.
- **MCP transport:** keep tools thin; share pure business logic with the browser instead of duplicating calculations.
