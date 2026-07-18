# @scout/orchestrator

Reserved for the backend that coordinates candidate batches, call state, structured outcomes, quote normalisation, risk flags, verified negotiation leverage, and recommendations.

Every provider callback must resolve to a `CallOutcome`; preserve evidence references and consent metadata.

---

## Backend module map (Person B)

All modules are wired to `@scout/contracts` + `@scout/vertical-config`.

| Path | Checklist item | Status |
| --- | --- | --- |
| `src/normalize/normalize-quote.js` | Effective-cost normalizer | wraps `effectiveMonthlyCost()` |
| `src/store/quotes-store.js` | Confirmed-quotes store (real leverage only) | in-memory, done |
| `src/benchmark/tavily-client.js` | Tavily area rent data | stub w/ env key + graceful fallback |
| `src/benchmark/benchmark-service.js` | Area price benchmark (cached) | TTL cache done; price parsing TODO |
| `src/leverage/leverage-builder.js` | 3 leverage types | done (comparable / benchmark / fee_attack) |
| `src/negotiation/price-drop.js` | Price-drop capture (money-shot) | done |
| `src/risk/fraud-signals.js` | Pre-visit-deposit fraud signal | done (config-driven keywords) |
| `src/risk/risk-service.js` | Red-flag 30%-below-benchmark | wraps `riskFlag()` |
| `src/transcripts/parse-transcript.js` | OpenAI transcript -> fields | fallback parser; OpenAI call TODO |
| `src/transcripts/recommend.js` | Plain-language recommendation | template; OpenAI call TODO |
| `src/ranking/rank-quotes.js` | Ranked shortlist (high_risk never #1) | done |
| `src/outcomes/call-outcome.js` | 3 structured outcomes | done |
| `src/pipeline.js` | End-to-end wiring | done |

### Run the backend smoke test (no API keys)

```bash
node apps/orchestrator/src/demo.smoke.js
```

It runs the eval fixtures through the full pipeline and prints the ranked
comparison, the Negotiator leverage, and the recommendation — including the two
demo money-shots (deposit scam -> HIGH RISK, fee-padder -> price drop).

### Where API keys plug in

- `TAVILY_API_KEY` → real benchmark in `benchmark/`
- `OPENAI_API_KEY` → real transcript parsing + recommendation in `transcripts/`

Without keys, both fall back so the pipeline stays runnable for the demo.

