# @scout/web

Customer-facing experience for Scout: requirement intake, discovery, live call
activity, and the ranked evidence-backed report.

Built against **`@scout/contracts` only** — this app never encodes quote logic,
ranking, or negotiation rules (those live in `apps/orchestrator` /
`packages/contracts`). It renders shared contract types and, until live keys are
wired in, the seed data in `src/lib/demo-data.ts` (mirrors `packages/evals`
fixtures).

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind.
- Types come from `@scout/contracts/types` (generated from the frozen JSON
  Schemas — not hand-duplicated, not re-declared here).
- Live call status uses **SSE** (`/api/calls/stream`), not websockets.

## Screens

| Route | Purpose |
| --- | --- |
| `/` | Overview of the four-stage flow. |
| `/intake` | Voice / document / free-text capture → **editable** review → confirm. Nothing dispatches until confirmed; the spec is reused verbatim. |
| `/discover` | Google-Places-style candidate list geofenced by commute **before** dispatch, with a map and per-candidate deselect. |
| `/calls` | Live ledger driven by the SSE stream: dialing → live → completed, expandable transcripts with tagged lines (disclosure / leverage / concession / fraud / guardrail). |
| `/report/[requirementSpecId]` | Ranked comparison table, fraud/risk badges, and a recommendation where every claim links to a specific transcript line. |

## Run

```bash
pnpm install                 # from repo root
pnpm --filter @scout/web dev # http://localhost:3000
```

No API keys are required to render the demo flow. The wiring points for live
services (all read from an untracked `.env`, see repo `.env.example`):

- `ELEVENLABS_INTAKE_AGENT_ID` — mounts the intake-concierge widget on `/intake`.
- `ELEVENLABS_NEGOTIATOR_AGENT_ID` + `ELEVENLABS_AGENT_PHONE_NUMBER_ID` —
  real outbound calls through ElevenLabs. They remain disabled until
  `OUTBOUND_CALLS_ENABLED=true`; the SSE route then relays provider webhook
  events instead of replaying seed calls.
- `MAPS_API_KEY` — swaps the SVG map placeholder for a real tile layer (props
  stay the same).

## Boundaries

- Reads/writes only `@scout/contracts` shapes; no imports from other `apps/*`.
- `RequirementSpec` is frozen and has no `id`/`confirmed_at` — confirmation state
  lives in the app-layer `ConfirmedRequirement` wrapper (`src/lib/types.ts`) so
  the spec itself is passed through unchanged.
