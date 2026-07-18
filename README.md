# Scout

Scout is a real-estate-focused voice negotiation assistant for the ElevenLabs **The Negotiator** challenge. It turns one confirmed requirement specification into comparable, evidence-backed offers: **intake -> calls -> negotiation -> ranked recommendation**.

This repository is intentionally a scaffold. It establishes team boundaries and shared contracts without implementing the product yet.

## Product focus

The first vertical is Indian real estate: rentals, PGs, hostels, and flats. Scout should discover nearby listings, call them in parallel, disclose its role honestly, collect itemised terms, flag fraud signals, negotiate only with verified competing offers, and return a ranked shortlist with transcripts/recordings.

## Repository map

```text
apps/
  web/                User intake, document upload, live activity, and comparison UI
  orchestrator/       Call lifecycle, structured outcomes, ranking, and audit events
  voice-agents/       ElevenLabs agent prompts, tools, and conversation policies
  simulated-market/   Counterparty agents and repeatable negotiation scenarios
packages/
  contracts/          Versioned schemas shared by every app
  vertical-config/    Real-estate taxonomy, red flags, and negotiation rules
  evals/              Golden-call checks and acceptance fixtures
docs/                 Product decisions, integration rules, and team plan
```

## Non-negotiable demo requirements

- One confirmed requirement specification produced by voice intake and one document path.
- At least three distinct counterparty/negotiation styles.
- Itemised, comparable quote outcomes for every call.
- At least one genuine, evidence-based change in price or terms during a call.
- A ranked recommendation linked to transcripts/recordings.
- Honest AI disclosure, no fabricated listings or competing bids, and no authority to commit funds.

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before adding an integration and [docs/TEAM-PLAN.md](docs/TEAM-PLAN.md) before choosing a workstream.

## First implementation step

Agree the `RequirementSpec`, `CallOutcome`, `Quote`, and `Recommendation` contracts in `packages/contracts` before building individual features. No application may depend directly on another application; communication happens through these contracts and documented events.

