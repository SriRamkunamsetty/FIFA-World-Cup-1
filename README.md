# StadiumOps Copilot

**An AI command center for FIFA World Cup 2026 tournament organizers.**

Built for the Google PromptWars hackathon — _Smart Stadiums & Tournament Operations_.

> Unofficial hackathon prototype. Not affiliated with or endorsed by FIFA. Match, gate, and crowd data shown in the app are simulated for demonstration (see [Assumptions](#assumptions--limitations)).

---

## Chosen vertical & persona

**Persona: Tournament Organizer** — the person in the control room responsible for the whole venue during a live match, not any single fan's journey.

The brief names exactly eight focus areas in one sentence: _"navigation, crowd management, accessibility, transportation, sustainability, multilingual assistance, operational intelligence, or real-time decision support."_ This submission addresses all eight, each mapped to a concrete, working feature — not a subset dressed up to sound comprehensive:

| Problem-statement area (verbatim) | Feature                                                                                                          | Where                      |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Navigation                        | Per-gate status tells fans/organizers which gate to use right now                                                | `GateStatusGrid`           |
| Crowd management                  | Live density, wait time, and trend per gate, refreshed every 8s                                                  | `GateStatusGrid`           |
| Accessibility                     | Wheelchair/sign-language/visual/sensory request triage, ranked and actionable                                    | `AccessibilityInsights`    |
| Transportation                    | Live rail/shuttle/bus status feeds both the briefing and the assistant's answers                                 | `MatchStatusBar`, briefing |
| Sustainability                    | Briefing nudges organizers toward transit over shuttle when both are viable, to cut lot congestion and emissions | `OperationalBriefing`      |
| Multilingual assistance           | One announcement → simultaneous PA/push translations + plain-language rewrite                                    | `BroadcastComposer`        |
| Operational intelligence          | One-click synthesized situation report across gates/transit/weather/accessibility                                | `OperationalBriefing`      |
| Real-time decision support        | Free-text Q&A, streamed token-by-token, grounded in live data                                                    | `DecisionAssistantPanel`   |

Separately, the brief's _Challenge Expectations_ section asks for **practical, real-world usability**. The Accessibility panel takes that literally: its recommendations aren't advisory text the organizer reads and forgets — a **"Mark as dispatched"** action closes the loop from AI suggestion to organizer action.

These aren't eight separate demos bolted together: Gate C is modeled as lacking a wheelchair-accessible path, so the gate grid, the Decision Assistant, the Briefing, and the Accessibility panel all reason about that _same_ fact from different angles — the way one real control room would, not eight disconnected tools.

## Approach & logic

- **Server is the source of truth.** The client never supplies operational facts (gate density, wait times, accessibility queue state). Every AI-backed route re-derives the current state server-side and only accepts a small amount of free-text _intent_ from the client (a chat question, a broadcast draft). This keeps the trust boundary small and makes prompt injection much less useful even if attempted — and the Operational Briefing takes no user text at all, so it has zero injection surface by construction.
- **One AI interface, two implementations.** `AiProvider` (`src/lib/ai/types.ts`) is implemented by `AnthropicProvider` (real Claude calls) and `MockAiProvider` (deterministic, offline). The app automatically uses the mock provider when `ANTHROPIC_API_KEY` is unset — so it's fully runnable, demoable, and testable with **zero secrets and zero API cost**, and the AI provider is trivially swappable/testable via dependency injection.
- **Thin routes, tested services.** Every API route is a small HTTP adapter: guard → validate → call a service function → respond. All decision logic (which AI call to make, how to merge its result with server-side facts, cache behavior) lives in `src/lib/services/*`, which knows nothing about `NextRequest`/`NextResponse`. That split is what makes 100%-covered service tests possible without constructing a fake HTTP request for every case.
- **Grounded, not generative-only, answers.** Every system prompt (`src/lib/ai/prompts.ts`) requires the model to reference only the live context it's given and forbids inventing gates, stats, or incidents.
- **Simulated data behind a real interface.** There's no live turnstile/transit feed for a hackathon prototype, so `src/lib/simulation/liveSignals.ts` generates a deterministic, smoothly-evolving matchday scenario (arrivals → kickoff crush → first half → half-time rush → second half → egress surge) as a pure function of time. Every consumer only depends on the `LiveSignals` type, so swapping in a real feed later touches one file.

## How it works

```
┌──────────────────────────────────────────────────────────────────┐
│  MatchStatusBar — match, weather, transit, LIVE indicator         │
├──────────────────────────────────────────────────────────────────┤
│  OperationalBriefing — one-click AI situation report               │
├────────────────────────────────────┬───────────────────────────────┤
│  Gate & Crowd Status (grid)          │  AI Decision Assistant        │
│  polls /api/live-signals every 8s    │  streams /api/decision-       │
│                                       │  assistant token-by-token     │
├────────────────────────────────────┴───────────────────────────────┤
│  Multilingual Broadcast              │  Accessibility Insights       │
│  /api/broadcast (cached)             │  /api/accessibility-insights  │
│                                       │  + "Mark as dispatched"       │
└──────────────────────────────────────────────────────────────────┘
```

- **`GET /api/live-signals`** — free, unauthenticated read of the current simulated snapshot. No user input, so no validation/CSRF needed.
- **`POST /api/decision-assistant`** — validates the question (Zod, ≤500 chars, ≤12 turns of history), re-derives live context server-side, and **streams** the Claude reply chunk-by-chunk over a plain `ReadableStream` response.
- **`POST /api/briefing`** — no input at all; synthesizes the full live snapshot into a 3-5 sentence situation report, explicitly naming the busiest gate, any transit disruption, weather risk, an accessibility backlog, and — only when genuinely relevant — a sustainability nudge toward transit over shuttle.
- **`POST /api/broadcast`** — validates the message (≤300 chars) and target languages, checks an in-memory cache keyed by a hash of (message, languages), then asks Claude for JSON-only output: one translation per language plus a plain-language, screen-reader-friendly rewrite.
- **`POST /api/accessibility-insights`** — takes the server's current accessibility request queue, asks Claude to rank it by urgency and suggest one concrete action per item, then merges that back onto the original records. The organizer can then mark an item **dispatched** in the UI, closing the loop from recommendation to action (tracked client-side in this prototype — see [Assumptions](#assumptions--limitations)).

## Getting started

```bash
npm install
cp .env.example .env.local   # optional — the app works with no keys at all
npm run dev                  # http://localhost:3000
```

Everything works immediately with **no environment variables set** — the Mock AI provider handles all AI-backed routes deterministically. To use real Claude-generated answers, set in `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Other scripts:

```bash
npm run build          # production build
npm run lint            # ESLint — next/core-web-vitals + strict TypeScript + full jsx-a11y "recommended" ruleset
npm run format:check    # Prettier — formatting is enforced, not just a suggestion
npm run typecheck       # tsc --noEmit, strict mode + noUnusedLocals/Parameters + noFallthroughCasesInSwitch
npm run test             # Vitest — 106 unit/component/route tests
npm run test:coverage    # coverage report, thresholds enforced (85% lines/statements/functions, 80% branches)
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, format check, tests with coverage thresholds, `npm audit`, and a production build on every push — with no secrets configured, exercising the exact same Mock-provider path a judge cloning the repo would hit.

## Code quality

- **Layered architecture.** `app/api/*/route.ts` (HTTP) → `lib/services/*` (domain logic, framework-agnostic) → `lib/ai/*` (AI provider abstraction) → `lib/simulation` / `lib/cache` (data). Each layer is independently testable; route handlers are typically ~20 lines because they don't contain business logic.
- **Strict TypeScript.** `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`. No non-null assertions (`!`) in application code — every array/optional access is handled explicitly.
- **Enforced formatting.** Prettier with `format:check` wired into CI — style is not left to reviewer taste or drift.
- **Zero dead code.** Every exported function is imported somewhere; ESLint's `no-unused-vars`/`@typescript-eslint/no-unused-vars` runs as an error, not a warning.
- **Zero `any`.** `@typescript-eslint/no-explicit-any` is an error; all API boundaries (including AI model output) are typed and Zod-validated.

## Security

- **Input validation** — every API route parses its body through a Zod schema (`src/lib/security/validation.ts`) before any business logic runs.
- **CSRF** — a signed, `httpOnly` double-submit cookie (`src/lib/security/csrf.ts`, HMAC-SHA256, `timingSafeEqual`). The token is returned in the JSON body rather than relying on client JS reading the cookie, so the cookie itself can stay `httpOnly`.
- **Rate limiting** — every AI-cost-incurring route (including `accessibility-insights` and `briefing`, which are GET-shaped reads but still cost money) is rate-limited per client IP. Centralized in one `enforceRequestGuards()` guard (`src/lib/security/guard.ts`) so there's exactly one place to audit.
- **Security headers** — CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, no `X-Powered-By`, set globally in `next.config.mjs`.
- **Prompt-injection awareness** — every system prompt explicitly labels user-supplied text as untrusted content, not instructions. The Briefing feature takes no user text at all, so it has no injection surface by construction.
- **Validated AI output** — translation and accessibility-triage responses are parsed and checked against a Zod schema before reaching the client; malformed model output fails loudly (502) instead of silently corrupting the UI.
- **No secrets in the client bundle** — the Anthropic key is read only in server-side route handlers.
- **Dependency hygiene** — `package.json` pins a patched `postcss` via `overrides` to close a transitive advisory pulled in by Next.js. `npm audit` reports **0 vulnerabilities**; CI re-checks this on every push.

**Known limitation:** the rate limiter and broadcast cache are in-process memory — fine for a single demo instance, but a production deployment with multiple replicas should move both to Redis/Upstash.

## Efficiency

- **Streaming, not blocking** — the Decision Assistant streams tokens as they arrive.
- **Caching** — identical broadcast requests are served from an in-memory cache instead of re-calling the model.
- **Deliberately slow polling** — live signals refresh every 8 seconds; this is operational context for a human, not a stock ticker.
- **No external runtime dependencies for styling** — system font stacks, no web-font CDN fetch, ~108 kB first-load JS for the entire app.

## Testing

`npm run test` runs **106 tests across 28 files** with Vitest, at **96% statement / 87% branch coverage** (enforced via CI thresholds: 85% lines/statements/functions, 80% branches):

- **Unit tests** for the rate limiter, CSRF signing/verification, Zod schemas, the live-signals simulator (determinism, match-status transitions), the broadcast cache, prompt rendering, environment validation, and the AI provider factory.
- **Service tests** — every function in `lib/services/*` is tested in isolation with a mocked `AiProvider`, at 100% coverage.
- **Route tests** — every API route is tested end-to-end by importing the actual route handler and calling it with a real `NextRequest`, running against the real Mock AI provider (no network, no secrets): CSRF rejection (403), validation rejection (400), and success paths are all exercised, not just claimed.
- **`AnthropicProvider` tests** inject a fake `fetch` to exercise real request-building and SSE-stream parsing logic with zero network calls, including malformed-JSON and non-OK-status error paths.
- **Component tests** cover every panel, including loading/error/disabled states and a simulated streaming response.

## Accessibility

- Semantic landmarks, a visible skip-to-content link, a real heading hierarchy, and **`eslint-plugin-jsx-a11y`'s full "recommended" ruleset (34 rules)** enforced in CI on top of `next/core-web-vitals`'s smaller built-in subset — accessibility regressions fail lint, not just manual review.
- `aria-live="polite"` regions for the streaming assistant reply, the briefing, and the accessibility insights list.
- Every interactive element is a real `<button>`/`<input>`/`<label>`; focus rings are never suppressed; `prefers-reduced-motion` disables the pulsing "LIVE" indicator.
- **Contrast ratios were measured, not assumed** (WCAG relative-luminance formula against every text/background pair in the palette):

  | Pair                                    | Ratio  | WCAG AA                          |
  | --------------------------------------- | ------ | -------------------------------- |
  | Body text (`ink`) on background         | 15.4:1 | Pass (needs 4.5:1)               |
  | Muted text (`ink-muted`) on background  | 6.95:1 | Pass                             |
  | Muted text on card surface              | 6.16:1 | Pass                             |
  | Button text on `floodlight` accent      | 8.70:1 | Pass                             |
  | "LIVE" status dot (graphical, not text) | 3.61:1 | Pass (needs 3:1 for UI graphics) |

  One real failure was found and fixed during development: the original `ink-faint` token measured 3.2–3.6:1 for placeholder text, footer copy, and the cache-hit note — all real text needing 4.5:1. Those four spots now use `ink-muted` instead; the token itself is kept only for the non-text status dot, where the weaker 3:1 UI-graphic threshold correctly applies.

- Each gate explicitly flags whether it has a wheelchair-accessible path; the one that doesn't (Gate C) is a scenario detail every AI feature reasons about, not an edge case they ignore.
- The broadcast composer sets `lang` per translation block so assistive tech pronounces each language correctly, and always produces a literal, plain-language English version alongside the translations.

## Assumptions & limitations

- **Live signals are simulated.** There's no real stadium IoT/turnstile/transit feed available for a hackathon prototype. `generateLiveSignals()` is a pure, deterministic function of time; it's isolated behind the `LiveSignals` type so a real feed can be substituted without touching UI or AI code.
- **Mock AI provider is a stand-in, not a translation engine.** With no API key configured, translations are clearly tagged `offline mock` rather than pretending to be real multilingual output.
- **"Mark as dispatched" is client-side state**, not a write to a real guest-services system — there's no persistence layer in this prototype. A production version would call a dispatch API instead of updating local React state.
- **Single organizer session, no auth.** No login flow; this is a single-tenant control-room console for the hackathon scope.
- **In-memory rate limiting/caching** — see [Security](#security) above.

## Project structure

```
src/
  app/                 Next.js App Router pages and API routes (thin HTTP adapters)
  components/          React components (Dashboard + panels + ui/ primitives)
  hooks/                useLiveSignals, useCsrfToken
  lib/
    ai/                 AiProvider interface, Anthropic client, Mock provider, prompts
    cache/              Broadcast translation cache
    security/           Validation, rate limiting, CSRF, request guard
    services/            Framework-agnostic domain logic, one file per feature
    simulation/         Deterministic live-signals generator
    env.ts               Validated environment config
  types/domain.ts       Shared domain types
tests/
  unit/                 Pure-logic and service tests
  routes/                End-to-end API route tests (real NextRequest, real Mock provider)
  components/           React component tests
  fixtures/              Shared test fixtures
```

## Tech stack

Next.js 15 (App Router) · TypeScript (strict) · Tailwind CSS · Zod · Vitest + Testing Library · Prettier · ESLint (`next/core-web-vitals` + `jsx-a11y/recommended`) · Anthropic Claude API — no other runtime dependencies.
