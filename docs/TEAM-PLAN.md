# Four-person delivery plan

The team should organise around the judging evidence rather than around a conventional frontend/backend split.

| Workstream | Primary owner | Deliverable | Integration contract |
| --- | --- | --- | --- |
| Voice agent and conversation design | 1 | ElevenLabs intake and negotiator agents; disclosure, interruption, refusal, and callback handling | Consumes `RequirementSpec`; emits tool calls matching `CallOutcome` |
| Simulated market and evaluation | 2 | Three counterparty styles, reproducible price behaviours, golden calls, and a price-moving negotiation | Accepts the same spec; produces recording/transcript references and outcomes |
| Orchestration and decisioning | 3 | Call batching, outcome persistence, quote normalisation, risk flags, verified-leverage guard, and ranking | Publishes `Quote` and `Recommendation` |
| User experience and document intake | 4 | Requirement confirmation, document-to-spec handoff, live activity, comparison, evidence, and demo flow | Sends and renders only shared contracts |

## Recommended working sequence

1. All four people agree and freeze the minimum shared contract shapes (one short session).
2. Workstreams 1 and 2 build in parallel; workstream 3 provides stubbed structured outcomes; workstream 4 designs against fixtures.
3. Integrate one complete three-call scenario before adding visual polish or extra data sources.
4. Run golden-call checks and then rehearse the exact story shown to judges.

## Why this split

The challenge explicitly rewards conversations that extract comparable terms and change a price through truthful leverage. Therefore the first two workstreams deserve half the team. The backend is still essential: it protects quote provenance and makes the final comparison credible. The UI scope should stay narrow and prove the chain of evidence rather than become a separate product build.

