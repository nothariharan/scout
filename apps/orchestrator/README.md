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
| `src/benchmark/tavily-client.js` | Tavily area rent data | real Tavily call (include_answer); fallback keyless |
| `src/benchmark/benchmark-service.js` | Area price benchmark (cached) | TTL cache + median price parsing done |
| `src/leverage/leverage-builder.js` | 3 leverage types | done (comparable / benchmark / fee_attack) |
| `src/negotiation/price-drop.js` | Price-drop capture (money-shot) | done |
| `src/risk/fraud-signals.js` | Pre-visit-deposit fraud signal | done (config-driven keywords) |
| `src/risk/risk-service.js` | Red-flag 30%-below-benchmark | wraps `riskFlag()` |
| `src/transcripts/parse-transcript.js` | OpenAI transcript -> fields | real Structured Outputs call; regex fallback keyless |
| `src/transcripts/recommend.js` | Plain-language recommendation | real OpenAI narrative + template fallback |
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

Without keys, all three fall back so the pipeline stays runnable for the demo.
API shapes are grounded in the official docs (Tavily search, OpenAI Structured
Outputs). See `docs/AGENT-TOOLS.md` for the ElevenLabs ↔ backend tool contract.

---

## Mid-call tool API (the ~40% integration checkpoint)

The integration surface Person A's ElevenLabs agent tools and Person C's UI hit.
Framework-free `node:http`, so it runs with no install.

```bash
node apps/orchestrator/src/server/start.js      # boot on :8787 (PORT overrides)
node apps/orchestrator/src/server/api.smoke.js  # self-test the full flow, no keys
```

| Method / path | Who calls it | Purpose |
| --- | --- | --- |
| `GET /health` | infra | liveness |
| `POST /calls` | orchestrator / Person A | start a call session for a candidate |
| `POST /calls/:id/quote` | **ElevenLabs agent tool** | write structured fields *during* the call |
| `GET /calls/:id/leverage` | **ElevenLabs Negotiator tool** | real leverage to cite (never invented) |
| `POST /calls/:id/outcome` | Person A | close as itemized_quote / callback_scheduled / declined |
| `GET /report` | Person C (UI) | ranked comparison + recommendation |

**Honesty constraint enforced in code:** `GET /calls/:id/leverage` only returns
numbers from confirmed itemized, non-fraud quotes in the store plus the real
benchmark — the agent can never be handed an invented competing bid.

## Discovery + telephony (boundary with Person A)

| Path | Challenge resource | Status |
| --- | --- | --- |
| `src/discovery/places-client.js` | Google Places call-list + commute geofence | stub w/ env key |
| `src/telephony/elevenlabs-telephony.js` | ElevenLabs outbound-call + batch calling (bridges Twilio) | real endpoints; needs agent + phone-number ids |
| `src/agent/initiation-data.js` | RequirementSpec -> dynamic_variables | done |

The orchestrator triggers the batch and owns call state; the ElevenLabs agent
owns the audio. `call_sid` / `conversation_id` map to `call-session` ids so
mid-call tool writes and the post-call webhook land in the right session.

### ElevenLabs webhooks

| Method / path | ElevenLabs event | Purpose |
| --- | --- | --- |
| `POST /agent/personalization` | call-start personalization | return `conversation_initiation_client_data` (the job spec as dynamic_variables) |
| `POST /agent/post-call` | post-call transcription | attach transcript evidence to the session |

Both verify the `ElevenLabs-Signature` HMAC when `ELEVENLABS_WEBHOOK_SECRET` is
set (skipped in dev). See `docs/AGENT-TOOLS.md`.

### Tests

```bash
node --test apps/orchestrator/test/    # unit + service + HTTP integration
```

