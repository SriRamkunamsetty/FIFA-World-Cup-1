# StadiumOps Copilot

**An AI command center for FIFA World Cup 2026 tournament organizers.**

Built for the Google PromptWars hackathon — *Smart Stadiums & Tournament Operations*.

> Unofficial hackathon prototype. Not affiliated with or endorsed by FIFA. Match, gate, and crowd data shown in the app are simulated for demonstration (see [Assumptions](#assumptions--limitations)).

---

## 1. Chosen vertical & persona

**Persona: Tournament Organizer** — the person in the control room responsible for the whole venue during a live match, not any single fan's journey.

**Focus areas, combined on purpose:** the challenge lists navigation & crowd management, multilingual assistance, accessibility, and real-time decision support as separate areas. This submission treats them as **one workflow**, because that's how an organizer actually experiences a matchday — they don't open four separate apps:

| Area | Where it lives | What it does |
|---|---|---|
| Navigation & crowd management | **Gate & Crowd Status** grid | Live density, wait time, and trend per gate, refreshed every 8s |
| Real-time decision support | **AI Decision Assistant** | Organizer asks a free-text question; Claude answers grounded in the live gate/transit/weather data on screen |
| Multilingual assistance | **Multilingual Broadcast** composer | One English announcement → simultaneous translations for PA/push, plus a plain-language, screen-reader-safe version |
| Accessibility | **Accessibility Insights** panel + accessibility flags on every gate | Prioritizes open wheelchair/sign-language/visual-assistance/sensory requests and recommends a concrete next action |

The four areas also reinforce each other by design: Gate C is modeled as having no wheelchair-accessible path, so the Decision Assistant, the Accessibility Insights panel, and the gate grid all surface the same underlying fact from three different angles — the way a real control room would.

## 2. Approach & logic

- **Server is the source of truth.** The client never supplies operational facts (gate density, wait times, accessibility queue state). Every AI-backed route re-derives the current state server-side and only accepts a small amount of free-text *intent* from the client (a chat question, a broadcast draft). This keeps the trust boundary small and makes prompt injection much less useful even if attempted.
- **One AI interface, two implementations.** `AiProvider` (see `src/lib/ai/types.ts`) is implemented by `AnthropicProvider` (real Claude calls) and `MockAiProvider` (deterministic, offline). The app automatically uses the mock provider when `ANTHROPIC_API_KEY` is unset — so it's fully runnable, demoable, and testable with **zero secrets and zero API cost**, and the AI provider is trivially swappable/testable via dependency injection.
- **Grounded, not generative-only, answers.** The Decision Assistant's system prompt requires every answer to reference the live context block it's given and forbids inventing gates, stats, or incidents — this is a decision-support tool, not a chatbot.
- **Simulated data behind a real interface.** There's no live turnstile/transit feed for a hackathon prototype, so `src/lib/simulation/liveSignals.ts` generates a deterministic, smoothly-evolving matchday scenario (arrivals → kickoff crush → first half → half-time rush → second half → egress surge) as a pure function of time. Every consumer only depends on the `LiveSignals` type, so swapping in a real feed later touches one file.

## 3. How it works

```
┌─────────────────────────────────────────────────────────────┐
│  MatchStatusBar — match, weather, transit, LIVE indicator    │
├───────────────────────────────────┬───────────────────────────┤
│  Gate & Crowd Status (grid)        │  AI Decision Assistant     │
│  polls /api/live-signals every 8s  │  streams /api/decision-    │
│                                     │  assistant token-by-token │
├───────────────────────────────────┴───────────────────────────┤
│  Multilingual Broadcast             │  Accessibility Insights   │
│  /api/broadcast (cached)            │  /api/accessibility-      │
│                                      │  insights                │
└─────────────────────────────────────────────────────────────┘
```

- **`GET /api/live-signals`** — free, unauthenticated read of the current simulated snapshot. No user input, so no validation/CSRF needed.
- **`POST /api/decision-assistant`** — validates the question (Zod, ≤500 chars, ≤12 turns of history), re-derives live context server-side, and **streams** the Claude reply chunk-by-chunk over a plain `ReadableStream` response so the organizer sees the answer forming in real time.
- **`POST /api/broadcast`** — validates the message (≤300 chars) and target languages, checks an in-memory cache keyed by a hash of (message, languages) to avoid paying for duplicate translations, then asks Claude for JSON-only output: one translation per language plus a plain-language, screen-reader-friendly rewrite.
- **`POST /api/accessibility-insights`** — takes the server's current accessibility request queue, asks Claude to rank it by urgency and suggest one concrete action per item, then merges that back onto the original records (the AI never overwrites the underlying facts, only annotates them).

## 4. Getting started

```bash
npm install
cp .env.example .env.local   # optional — the app works with no keys at all
npm run dev                  # http://localhost:3000
```

Everything works immediately with **no environment variables set** — the Mock AI provider handles all three AI-backed routes deterministically. To use real Claude-generated answers, set in `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Other scripts:

```bash
npm run build        # production build
npm run lint          # ESLint (flat config, next/core-web-vitals + strict TS)
npm run typecheck     # tsc --noEmit
npm run test          # Vitest — unit + component tests
npm run test:coverage # coverage report
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests, `npm audit`, and a production build on every push — with no secrets configured, exercising the exact same Mock-provider path a judge cloning the repo would hit.

## 5. Security

- **Input validation** — every API route parses its body through a Zod schema (`src/lib/security/validation.ts`) before any business logic runs. Nothing untyped reaches a handler.
- **CSRF** — a signed, `httpOnly` double-submit cookie (`src/lib/security/csrf.ts`). The server issues a token, the client echoes it back as `x-csrf-token`, and the server verifies the header matches the cookie *and* that the signature is valid and unexpired (HMAC-SHA256, `timingSafeEqual`). Because the token is returned in the JSON body rather than relying on client JS reading the cookie, the cookie itself can stay `httpOnly`.
- **Rate limiting** — every AI-cost-incurring route (including `accessibility-insights`, which is a GET-shaped read but still costs money) is rate-limited per client IP (`src/lib/security/rateLimit.ts`). Centralized in one `enforceRequestGuards()` guard (`src/lib/security/guard.ts`) so there's exactly one place to audit, not three near-duplicate copies.
- **Security headers** — CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and no `X-Powered-By`, set globally in `next.config.mjs`.
- **Prompt-injection awareness** — every system prompt (`src/lib/ai/prompts.ts`) explicitly labels user-supplied text as untrusted content, not instructions, and tells the model to keep operating as intended if that text tries to override its role.
- **Validated AI output** — the model is asked for JSON-only responses for translation and accessibility triage, and the response is parsed and checked against a Zod schema before it ever reaches the client. Malformed model output fails loudly (502) instead of silently corrupting the UI.
- **No secrets in the client bundle** — the Anthropic key is read only in server-side route handlers, never exposed via `NEXT_PUBLIC_*`.
- **Dependency hygiene** — `package.json` pins a patched `postcss` via `overrides` to close a transitive moderate-severity advisory pulled in by Next.js; `npm audit` reports **0 vulnerabilities** at time of submission, and CI re-checks this on every push.

**Known limitation:** the rate limiter and broadcast cache are in-process memory, which is fine for a single demo instance but won't coordinate across multiple serverless replicas — a production deployment should move both to Redis/Upstash.

## 6. Efficiency

- **Streaming, not blocking** — the Decision Assistant streams tokens as they arrive instead of waiting for the full completion, cutting perceived latency substantially for longer answers.
- **Caching** — identical broadcast requests (same message + same language set) are served from an in-memory cache instead of re-calling the model (`src/lib/cache/broadcastCache.ts`).
- **Deliberately slow polling** — live signals refresh every 8 seconds. This is operational context for a human, not a stock ticker; a tighter interval would just burn resources for no decision-quality benefit.
- **No external runtime dependencies for styling** — the UI uses system font stacks instead of a web-font CDN, so there's nothing to fetch, nothing to fail if a font host is unreachable, and a smaller, faster bundle (~107 kB first load JS).

## 7. Testing

`npm run test` runs 58 tests across 13 files with Vitest:

- **Unit tests** for the rate limiter, CSRF signing/verification, Zod schemas, the live-signals simulator (including determinism and match-status transitions), the broadcast cache, prompt rendering, and environment validation.
- **`AnthropicProvider` tests** inject a fake `fetch` (dependency injection — see the constructor in `src/lib/ai/client.ts`) to exercise real request-building and SSE-stream parsing logic with zero network calls, including malformed-JSON and non-OK-status error paths.
- **Component tests** (`@testing-library/react`) cover loading states, disabled/enabled button logic, error rendering, and — for the Decision Assistant — a simulated streaming response.

## 8. Accessibility

- Semantic landmarks, a visible skip-to-content link, and a real heading hierarchy.
- `aria-live="polite"` regions for the streaming assistant reply and the accessibility insights list, so screen-reader users get updates without a wall of re-announcements.
- Every interactive element is a real `<button>`/`<input>`/`<label>` — nothing is click-only on a `<div>` — and focus rings are never suppressed.
- `prefers-reduced-motion` disables the pulsing "LIVE" indicator.
- Each gate explicitly flags whether it has a wheelchair-accessible path, and the one gate that doesn't (Gate C) is a deliberate scenario detail the AI features reason about, not an edge case they ignore.
- The broadcast composer sets the `lang` attribute per translation block so assistive tech pronounces each language correctly, and always produces a plain-language, literal English version alongside the translations.

## 9. Assumptions & limitations

- **Live signals are simulated.** There's no real stadium IoT/turnstile/transit feed available for a hackathon prototype. `generateLiveSignals()` is a pure, deterministic function of time so the demo is reproducible; it's isolated behind the `LiveSignals` type so a real feed can be substituted without touching any UI or AI code.
- **Mock AI provider is a stand-in, not a translation engine.** With no API key configured, translations are clearly tagged `offline mock` rather than pretending to be real multilingual output — this exists for zero-cost local running and CI, not as the primary demo path.
- **Single organizer session, no auth.** There's no login flow; this is a single-tenant control-room console for the hackathon scope, not a multi-user permissions system.
- **In-memory rate limiting/caching** — see [Security](#5-security) above.

## 10. Project structure

```
src/
  app/                 Next.js App Router pages and API routes
  components/          React components (Dashboard + panels + ui/ primitives)
  hooks/                useLiveSignals, useCsrfToken
  lib/
    ai/                 AiProvider interface, Anthropic client, Mock provider, prompts
    cache/              Broadcast translation cache
    security/           Validation, rate limiting, CSRF, request guard
    simulation/         Deterministic live-signals generator
    env.ts               Validated environment config
  types/domain.ts       Shared domain types
tests/
  unit/                 Pure-logic tests
  components/           React component tests
  fixtures/              Shared test fixtures
```

## Tech stack

Next.js 15 (App Router) · TypeScript (strict) · Tailwind CSS · Zod · Vitest + Testing Library · Anthropic Claude API — no other runtime dependencies.
