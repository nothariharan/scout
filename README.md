# Scout

**autonomous voice buyer that calls, compares, and haggles — with receipts.**

built for ElevenLabs Hack-Nation · **The Negotiator**  
live product · real outbound calls · verified leverage only · never invents competitor prices

---

## demo (start here)

<!-- Legacy repository-file links are intentionally hidden. GitHub renders the
native attachment URLs below as in-page media players. -->
<!--
| | |
| --- | --- |
| **live app** | [scout-dusky-six.vercel.app](https://scout-dusky-six.vercel.app) |
| **demo video** | [watch `scout-demo.mp4`](media/demo/scout-demo.mp4) — full product walkthrough |
| **negotiation call 1** | [listen · conv `5201kxx…`](media/demo/negotiation-call-1-conv_5201kxx76rwvebfb1s430ve2nm5h.mp3) |
| **negotiation call 2** | [listen · conv `9401kxx…`](media/demo/negotiation-call-2-conv_9401kxx51dk6fxgveay6375kr57n.mp3) |
| **all negotiation audio** | [download zip](media/demo/negotiation-audio.zip) |
| **source archive** | [Scout-HackNation zip](media/demo/scout-hacknation-source.zip) — open `START-HERE.md` inside first |

> tip: on GitHub, click an `.mp3` / `.mp4` to play inline. zip files download.

### demo video

the main walkthrough of Scout end-to-end (intake → calls → ranked recommendation):

[`media/demo/scout-demo.mp4`](media/demo/scout-demo.mp4)

### live bargaining audio

two real ElevenLabs negotiation conversations from the hackathon build:

1. [`negotiation-call-1-conv_5201kxx76rwvebfb1s430ve2nm5h.mp3`](media/demo/negotiation-call-1-conv_5201kxx76rwvebfb1s430ve2nm5h.mp3)  
   conversation id: `conv_5201kxx76rwvebfb1s430ve2nm5h`
2. [`negotiation-call-2-conv_9401kxx51dk6fxgveay6375kr57n.mp3`](media/demo/negotiation-call-2-conv_9401kxx51dk6fxgveay6375kr57n.mp3)  
   conversation id: `conv_9401kxx51dk6fxgveay6375kr57n`

bundle: [`negotiation-audio.zip`](media/demo/negotiation-audio.zip)
-->

| Evidence | Inline player | What it shows |
| --- | --- | --- |
| Product walkthrough | Video below | Confirmed property brief → discovery → parallel negotiation → evidence-backed recommendation |
| Negotiation call 1 | Video + audio below | Hindi-first hostel availability, scope, and price discussion |
| Negotiation call 2 | Video + audio below | Bounded, truthful India-hostel negotiation and clean close |

### product walkthrough

https://github.com/user-attachments/assets/37ed5a8d-6ff8-4510-a255-8511ee6862ab

### negotiation call 1

https://github.com/user-attachments/assets/c7d7253e-b766-4609-b70a-fa253f443b3f

https://github.com/user-attachments/files/30166025/negotiation-call-1-conv_5201kxx76rwvebfb1s430ve2nm5h.mp3

### negotiation call 2

https://github.com/user-attachments/assets/6e9e3f45-527b-4dd4-902d-d524af36a0e8

https://github.com/user-attachments/files/30166024/negotiation-call-2-conv_9401kxx51dk6fxgveay6375kr57n.mp3

---

## what it is

people shopping for high-friction local services (movers, hostels, contractors) waste hours calling vendors one-by-one. quotes are inconsistent. leverage dies between calls.

Scout turns **one confirmed brief** into:

1. discovery (OpenStreetMap)
2. parallel voice calls (ElevenLabs → Twilio)
3. itemized, comparable quotes
4. haggling that may only cite **verified** competing bids
5. a ranked recommendation with transcript evidence

hard rule: Scout never pays, signs, or binds the customer. AI discloses when asked.

first vertical: **moving**. live multilingual path: **India hostel / PG** (Hindi-first + Indian English).

---

## stack that gives us an edge

ElevenLabs · Twilio · Next.js · Node orchestrator · OpenStreetMap · Tavily · Gemini / Claude (via ElevenLabs) · OpenAI helpers · pnpm monorepo · simulated market · verified-leverage strategy engine

honesty is enforced in code — the voice LLM speaks; the orchestrator decides tactics and which numbers are allowed.

---

## repository map

```text
apps/
  web/                intake, live activity, comparison UI (Vercel)
  orchestrator/       call lifecycle, strategy, ranking, audit
  voice-agents/       ElevenLabs intake + negotiator prompts/tools
  simulated-market/   deterministic seller styles (no phone credits)
packages/
  contracts/          RequirementSpec · CallOutcome · Quote · Recommendation
  vertical-config/    fees, red flags, negotiation levers
  evals/              golden-call fixtures
media/demo/           demo video · bargaining audio · source zip
docs/                 architecture, submission copy, Notebook LM prompt
START-HERE.md         how to read this repo / the zip
```

---

## how to read this repo

1. this README (demo links above)
2. [`START-HERE.md`](START-HERE.md) — reading order for the zip / new contributors
3. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system boundaries
4. [`docs/negotiation-engine.md`](docs/negotiation-engine.md) — verified leverage
5. [`docs/voice-and-multilingual.md`](docs/voice-and-multilingual.md) — Hindi / accent path
6. [`apps/voice-agents/src/agents/negotiator.md`](apps/voice-agents/src/agents/negotiator.md) — what the agent is allowed to say
7. [`apps/orchestrator/src/negotiation/strategy-engine.js`](apps/orchestrator/src/negotiation/strategy-engine.js) — next move brain

Hack-Nation form copy: [`docs/hack-nation-submission.md`](docs/hack-nation-submission.md)

---

## non-negotiable demo requirements

- one confirmed requirement spec reused across every call
- ≥3 distinct counterparty / negotiation styles
- itemized, comparable quote outcomes
- at least one genuine, evidence-based price/term change
- ranked recommendation linked to transcript evidence
- honest AI disclosure · no fabricated bids · no authority to commit funds

---

## run locally

```bash
pnpm install
pnpm --filter @scout/orchestrator serve
pnpm --filter @scout/web dev
```

open http://localhost:3000 — or jump to `/moving` / `/real-estate`

outbound calls stay disabled until `OUTBOUND_CALLS_ENABLED=true` and keys are set (see `.env.example`).

no-credit smoke path:

```bash
node apps/simulated-market/src/simulator.smoke.js
node apps/orchestrator/src/moving/moving-workflow.smoke.js
```

live ElevenLabs tool boundary: [`docs/AGENT-TOOLS.md`](docs/AGENT-TOOLS.md)

---

## deploy

- **frontend:** [https://scout-dusky-six.vercel.app](https://scout-dusky-six.vercel.app)  
- **source zip for judges:** [`media/demo/scout-hacknation-source.zip`](media/demo/scout-hacknation-source.zip)

---

## project meta

| | |
| --- | --- |
| challenge | The Negotiator — voice agents that call, compare, and haggle |
| team id | `HN-1602` |
| github | [nothariharan/scout](https://github.com/nothariharan/scout) |
| live | [scout-dusky-six.vercel.app](https://scout-dusky-six.vercel.app) |
