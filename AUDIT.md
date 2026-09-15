# Repository Audit — Rapid Type Revamp

**Audit date:** 2026-09-15  
**Audited branch:** `main`  
**Audited commit:** `03b721f9fb96566469bb15348cbdec917150c0d3`  
**Repository:** `nishanth-kkj9/rapid-type-revamp`

## Executive summary

Rapid Type Revamp is a client-first typing trainer built with React, TypeScript, TanStack Start/Router, Vite, Tailwind CSS, and a small MCP surface. The repository has a good baseline of automated checks, typed application logic, browser-local persistence, and focused unit tests.

The main risks are architectural and deployment-related rather than an obvious critical application vulnerability:

1. The MCP endpoint is explicitly configured as unauthenticated. If `/mcp` is publicly reachable, anyone who can reach it can call the read-only tools.
2. The generated MCP routes trust forwarded host/protocol headers. The current README correctly limits that trust to Lovable-hosted deployments; other deployments must change the generated configuration or own the files.
3. The CI dependency audit is report-only. A high-severity advisory does not fail CI.
4. The anti-paste/anti-drop typing guard is a fairness feature, not a security boundary. Browser users can modify client code or browser state.
5. `WordShooter.tsx` was added in the latest commit, but the current root route does not render it. The game exists in the repository but is not part of the active application flow.
6. The README is generally strong, but the documented feature set should distinguish the active trainer from the unmounted game component.

No critical server-side data-processing vulnerability was identified from the reviewed source. This is a source audit, not a penetration test or a dependency database scan performed locally.

## Architecture snapshot

```text
Browser
  |
  +--> TanStack Start route: /
  |      |
  |      +--> typing UI
  |      +--> localStorage history
  |      +--> sentenceGenerator.ts
  |      +--> typingStats.ts
  |      +--> WpmChart / ProblemKeys / Keyboard / HistoryPanel
  |
  +--> /mcp
  |      |
  |      +--> Lovable MCP handler
  |      +--> generate_passage
  |      +--> analyze_typing
  |
  +--> /.well-known/oauth-protected-resource
         |
         +--> MCP discovery metadata

Build/runtime
  |
  +--> Vite + TanStack Start
  +--> Nitro / deployment target supplied by Lovable config
  +--> src/server.ts SSR error wrapper
```

## Findings

### A-01 — Unauthenticated MCP endpoint

**Severity:** High when `/mcp` is internet-exposed; Low/Informational for a trusted private deployment.

`.lovable/mcp/manifest.json` declares `auth.type` as `none`. The two exposed tools are read-only, but the endpoint remains callable without authentication.

**Impact:** Public callers can consume server resources and invoke the MCP tools. The current tools do not appear to mutate application data or access secrets, so impact is primarily availability/abuse rather than direct data modification.

**Recommended action:** Keep the tools unauthenticated only when `/mcp` is intentionally public and place rate limiting or access control at the edge. For authenticated deployments, enable the MCP authentication mechanism supported by the selected hosting stack.

### A-02 — Forwarded host/protocol trust is deployment-sensitive

**Severity:** High on an untrusted reverse-proxy topology.

`src/routes/mcp.ts` and `src/routes/[.well-known]/oauth-protected-resource.ts` use `trustForwardedHost: true` and `trustForwardedProto: true`. The README already explains that this is intended for Lovable's proxy behavior.

**Impact:** On a deployment where clients can influence `X-Forwarded-Host` or `X-Forwarded-Proto`, generated absolute URLs and origin-related behavior may become attacker-controlled.

**Recommended action:** Before self-hosting or putting the app behind a different proxy, set both values to `false` or constrain trust to the actual trusted proxy. Because the route is auto-generated, take ownership according to the existing generator instructions before editing.

### A-03 — CI dependency audit does not gate merges

**Severity:** Medium.

The GitHub Actions workflow runs `bun audit --audit-level=high`, but failures are converted into a warning and the job still succeeds.

**Impact:** Known high-severity dependency advisories can merge without a red CI status.

**Recommended action:** Decide on a policy explicitly. A practical compromise is to keep the audit informative for pull requests but run a separate scheduled/security workflow that fails on actionable high/critical vulnerabilities, or make the audit job blocking when advisories have a fix.

### A-04 — Client-side anti-cheat is not a security control

**Severity:** Low.

The typing input rejects paste, drop, and some multi-character changes. This is useful for fair-play UX, but all enforcement happens in the browser.

**Impact:** A user controlling the browser can modify JavaScript, dispatch events, edit local state, or call exported functions directly.

**Recommended action:** Keep the guard for UX/fairness. Do not describe it as tamper-proof or suitable for competitive rankings. If competitive leaderboards are added later, validate attempts server-side and treat the browser as untrusted.

### A-05 — Game component is currently unmounted

**Severity:** Medium (feature/integration quality).

`src/components/WordShooter.tsx` exists, but `src/routes/index.tsx` does not import or render it. The latest commit message says a game mode was added, while the current route still renders only the original typing trainer flow.

**Impact:** The repository can advertise or imply a game mode that users cannot reach through the active route. The component also becomes less likely to receive CI/runtime coverage.

**Recommended action:** Either integrate the component through an explicit game-mode state/route or keep it clearly marked as an inactive experiment. Do not list it as an active product feature until mounted and tested through the user flow.

### A-06 — History schema validates shape better than semantics

**Severity:** Low.

Imported history is validated with Zod, which is good, but values such as `wpm`, `accuracy`, `elapsed`, and `date` have no business-range constraints.

**Impact:** A hand-edited import can contain unrealistic values and affect charts, best-score displays, or history ordering. This is local-data integrity, not an external injection path.

**Recommended action:** Add semantic bounds when the import format is stabilized, for example non-negative counters, finite percentages in `0..100`, reasonable elapsed ranges, and sane timestamps.

### A-07 — MCP cumulative sample validation could be stronger

**Severity:** Low.

`analyze_typing` accepts `perSecondCorrect` as non-negative integers but does not require the sequence to be monotonic or to remain compatible with the calculated correct-character count.

**Impact:** Invalid sample sequences can produce negative deltas and therefore distorted consistency calculations.

**Recommended action:** Validate cumulative samples as monotonic non-decreasing values and optionally cap the final sample at the number of correct characters.

## What is already good

- TypeScript is used consistently for application logic.
- Unit tests cover core statistics and local history persistence.
- The project has dedicated lint, formatting, typecheck, test, and build scripts.
- CI uses `bun install --frozen-lockfile`, which prevents lockfile drift during verification.
- CI permissions are restricted to `contents: read`.
- Local history loading is resilient to malformed JSON/storage failures.
- Imported history is schema-validated rather than blindly trusted.
- The server entry has explicit catastrophic SSR error normalization.
- The README already documents the most important MCP deployment caveats.
- The code avoids a backend for ordinary typing history, reducing the amount of sensitive user-performance data that leaves the browser.

## Test/verification posture

The repository contains focused unit tests for `typingStats`, `sentenceGenerator`, and MCP tools. CI defines independent checks for linting, formatting, TypeScript, tests, and the production build, plus a dependency audit.

The latest commit's combined commit-status endpoint returned no published status entries during this audit. That means this audit cannot claim a currently green GitHub status from the status API alone.

A full local install/build was not executed in this environment because the runtime could not resolve `github.com` for a direct clone. The conclusions above therefore come from repository source inspection and the committed CI configuration, not from a local rebuild.

## Priority backlog

### P0 — deployment safety

- Keep `/mcp` private or rate-limited if it is not intended to be public.
- Verify forwarded-header trust against the real production proxy.

### P1 — product correctness

- Integrate `WordShooter` into an explicit game mode, or remove/label it as inactive.
- Add semantic validation to imported history and MCP sample sequences.

### P2 — security/maintenance

- Decide whether dependency audit failures should block merges.
- Add security headers and deployment hardening at the hosting/proxy layer where appropriate.
- Add end-to-end coverage for the main typing flow and game mode once game mode is integrated.

## Audit conclusion

**Overall posture: Good engineering baseline, with deployment/security policy gaps and one notable feature-integration gap.**

The repository is in a reasonable state for continued development. The most important next step is not a broad rewrite; it is to make the deployment contract explicit, integrate or deprecate the new game component, and tighten validation around externally supplied MCP inputs and imported local history.
