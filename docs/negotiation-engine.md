# Scout — Negotiation Engine & Evidence Loop

## Core idea

Scout does not “sound persuasive.” It **closes an evidence loop**.

Talk → capture structured quote → verify → reuse as leverage → move a later seller → rank with provenance.

## Why most AI calling demos fail this challenge

They:

- invent competitor prices
- skip itemization
- optimize for fluency over truth
- cannot prove why a recommendation won

Scout treats every cited number as a database fact, not a model hallucination.

## Verified leverage

A negotiation turn may cite only quotes that already exist as completed, non-high-risk `CallOutcome` records.

Allowed leverage types:

| Type | Meaning |
| --- | --- |
| `comparable_unit` | Another provider’s captured unit / package price |
| `benchmark` | Batch median or optional Tavily-augmented market reference |
| `fee_attack` | Challenge padded / opaque fees against itemized peers |

If leverage is empty, the agent asks for itemization and clarifies — it does not fabricate pressure.

## Strategy engine vs voice LLM

```text
strategy engine (deterministic)
        │
        │ next action: ask_itemize | cite_comparable | fee_attack |
        │              de_escalate | verify_urgency | pause | accept_path
        ▼
voice LLM (ElevenLabs negotiator)
        │
        │ speaks the action in natural language
        │ never invents competitor bids
        ▼
tool calls back to orchestrator
        │
        └── log quote / get leverage / get strategy / record outcome
```

This split is the product’s trust boundary.

## Call lifecycle

1. Create session from confirmed `RequirementSpec`
2. Inject `call_id` + dynamic context into ElevenLabs
3. Agent opens, discloses AI role when asked
4. Collect itemized costs into vertical fee taxonomy
5. Pull verified leverage if available
6. Execute next strategy action
7. Persist `CallOutcome` + transcript reference
8. Normalize quote → risk flags → become future leverage
9. After batch: rank → recommendation

## Risk & fraud flags

Examples Scout looks for:

- pre-visit payment / deposit pressure
- non-binding “ballpark only” quotes presented as final
- hostage-load style “cash before unloading”
- suspiciously low vs batch/market reference

`high_risk` quotes are never ranked #1.

## Price-drop / money-shot

The demo’s proof moment is a later call where Scout cites a real competing quote and the seller improves price or terms. That change is captured as evidence — not claimed after the fact.

## Ranking

Ranking consumes:

- normalized all-in / effective cost
- risk flags
- completeness of itemization
- negotiation outcome quality
- transcript-linked evidence

Output: ranked shortlist + recommendation narrative tied to provenance.

## Simulated market as test harness

The simulated market is not a toy UI. It runs the **same** `planNegotiation()` contract against scripted seller personalities so the team can prove:

- leverage gating works
- price moves only when evidence exists
- hard sellers and risk sellers behave differently
- golden fixtures stay green without burning ElevenLabs / Twilio credits

## Hard rules (non-negotiable)

1. One confirmed spec reused across every call  
2. Never invent inventory, availability, or competing offers  
3. Never pay, sign, reserve, or bind  
4. Disclose AI role accurately when asked  
5. Recommendation must link to captured evidence  

## Why this architecture scales to other verticals

Moving fees, hostel rents, and renovation line items are different taxonomies — but the loop is identical:

confirm → discover → call → itemize → verify → haggle → rank

Vertical config swaps the schema and red flags. The negotiation brain stays.
