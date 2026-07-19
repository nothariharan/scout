# Scout — Technical Architecture

## System shape

Scout is a `pnpm` monorepo with strict app boundaries. Apps do not import other apps’ source. Shared truth lives in packages.

```text
apps/
  web/                 Next.js 14 UI — intake, discovery, live calls, report
  orchestrator/        Node HTTP server — sessions, strategy, normalize, rank
  voice-agents/        ElevenLabs prompts, tools, provision scripts
  simulated-market/    Deterministic counterparties (no LLM / no phone)
packages/
  contracts/           RequirementSpec, CallOutcome, Quote, Recommendation
  vertical-config/     fees, fraud rules, negotiation policy per vertical
  evals/               golden-call fixtures
```

## End-to-end data flow

```text
Voice / document / text intake
        ↓
Confirmed RequirementSpec (frozen; reused verbatim on every call)
        ↓
Discovery → candidate call list (OpenStreetMap Nominatim + Overpass)
        ↓
Orchestrator creates call sessions
  injects call_id + strategy / leverage as dynamic vars
        ↓
ElevenLabs Negotiator outbound call (opt-in telephony gate)
        ↓
Mid-call tools on orchestrator:
  log quote → get verified leverage → get next strategy action → record outcome
        ↓
Normalize + risk / fraud flags + price-drop capture
        ↓
Confirmed quotes become leverage for later calls
        ↓
Rank (high_risk never #1) + recommendation with transcript evidence
        ↓
Web report UI (live updates via SSE)
```

## Responsibility split

| Boundary | Owns | Does not own |
| --- | --- | --- |
| `apps/web` | Confirmation UI, activity feed, comparison / evidence views | Negotiation decisions |
| `apps/orchestrator` | Call state, strategy, normalization, ranking, audit | Voice wording |
| `apps/voice-agents` | Personas, disclosure, tool invocation, language policy | DB writes outside tools |
| `apps/simulated-market` | Seller styles + deterministic scenarios | Production ranking logic |
| `packages/contracts` | Shared schemas | Provider glue |
| `packages/vertical-config` | Vertical taxonomy + red flags | Control flow |

## Tech stack (what actually powers the system)

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 14, React 18, TypeScript, Tailwind, `@elevenlabs/react` |
| Backend | Framework-free Node `http` orchestrator (`:8787`) |
| Voice platform | ElevenLabs Conversational AI |
| ASR / TTS | ElevenLabs realtime STT + Flash TTS; interruption + turn-taking |
| Agent LLMs (via ElevenLabs) | Intake: Gemini; Hindi negotiator: Claude Sonnet |
| Optional helpers | OpenAI for transcript parse / recommendation narrative |
| Market enrichment | Tavily area benchmarks (optional; never invents quotes) |
| Discovery | OpenStreetMap Nominatim + Overpass |
| Telephony | ElevenLabs → Twilio outbound API (Scout does not store Twilio creds) |
| Live UI | Server-Sent Events (`/events`) |
| Tooling | Python provision scripts, ElevenLabs agent tests, smoke evals |

## Critical design: honesty is enforced in code

The voice LLM is **not** the negotiation brain.

- Strategy engine (`planNegotiation`) chooses the next tactic
- `/leverage` returns only verified competing quotes from completed non-high-risk outcomes
- Market reference starts empty; median of batch quotes (Tavily may augment)
- Three leverage types: `comparable_unit`, `benchmark`, `fee_attack`
- Conversation climate signals (annoyance / urgency / flexibility) feed de-escalate / verify-urgency moves

If a number is not in a captured `CallOutcome`, Scout cannot cite it.

## Telephony & safety gates

- Outbound calls disabled by default (`OUTBOUND_CALLS_ENABLED`)
- Public HTTPS orchestrator URL required for ElevenLabs webhook tools
- Agent secret header (`x-scout-agent-secret`) on tool calls
- Recording consent and disclosure policies in agent prompts
- Scout never pays, signs, or binds

## Vertical configurability

Moving is the first vertical. The same engine can load different fee taxonomies, red flags, and negotiation levers from `packages/vertical-config` (moving, home renovation, real-estate / hostel paths).

## Simulated market (repeatable demo)

Four deterministic seller styles exercise the same strategy contract without burning credits:

1. **transparent_operator** — cooperative; moves on verified comparable  
2. **fee_padder** — padded fees; still moves after leverage  
3. **hard_seller** — inflexible; often decline / pause  
4. **hostage_load_risk** — cash-before-unload style risk → high risk / decline  

Smoke path:

```bash
node apps/simulated-market/src/simulator.smoke.js
node apps/orchestrator/src/moving/moving-workflow.smoke.js
```

## Integration contract with ElevenLabs

Agents receive dynamic variables (`call_id`, strategy context) and call orchestrator HTTPS tools mid-conversation. The orchestrator persists structured outcomes; the web app streams progress and renders the final ranked report.

## What “done” means for the hackathon demo

A single confirmed request passes unchanged through multiple calls. All calls finish with structured outcomes. At least one later negotiation references a verified competing bid and changes a term. The UI shows comparable all-in costs, risks, a recommendation, and transcript evidence.
