# Scout

Scout is an autonomous buying agent for the ElevenLabs **The Negotiator** challenge. Its first working vertical is moving companies: it turns one confirmed moving brief into an evidence-backed call list, reviewed negotiation actions, itemized quotes, and a ranked recommendation.

The current implementation is a functional moving-pilot foundation, with provider boundaries kept configurable for future home-service verticals.

## Product focus

The first vertical is moving. Scout discovers nearby businesses through OpenStreetMap, carries the same confirmed scope into each conversation, discloses its AI role, collects itemized costs, flags pressure and non-binding-quote risks, negotiates only with verified leverage, and returns a ranked shortlist. The same contracts can be configured for another service vertical without rebuilding the core engine.

## Repository map

```text
apps/
  web/                User intake, document upload, live activity, and comparison UI
  orchestrator/       Call lifecycle, structured outcomes, ranking, and audit events
  voice-agents/       ElevenLabs agent prompts, tools, and conversation policies
  simulated-market/   Counterparty agents and repeatable negotiation scenarios
packages/
  contracts/          Versioned schemas shared by every app
  vertical-config/    Configurable vertical taxonomy, red flags, and negotiation rules
  evals/              Golden-call checks and acceptance fixtures
docs/                 Product decisions, integration rules, and team plan
```

## Non-negotiable demo requirements

- One confirmed moving requirement specification reused across every call.
- At least three distinct counterparty/negotiation styles.
- Itemised, comparable quote outcomes for every call.
- At least one genuine, evidence-based change in price or terms during a call.
- A ranked recommendation linked to captured quote evidence and transcripts.
- Honest AI disclosure, no fabricated listings or competing bids, and no authority to commit funds.

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before adding an integration and [docs/TEAM-PLAN.md](docs/TEAM-PLAN.md) before choosing a workstream.

## Run locally

```bash
pnpm install
pnpm --filter @scout/orchestrator serve
pnpm --filter @scout/web dev
```

Open `http://localhost:3000/moving`, confirm a brief, then continue through
Discovery, Calls, and Report. Outbound calls stay disabled by default. The
repeatable no-credit test path is:

```bash
node apps/simulated-market/src/simulator.smoke.js
node apps/orchestrator/src/moving/moving-workflow.smoke.js
```

For the live ElevenLabs tool boundary and deployment requirements, see
[`docs/AGENT-TOOLS.md`](docs/AGENT-TOOLS.md).
