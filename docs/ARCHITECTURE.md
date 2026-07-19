# Scout architecture

## The product in one sentence

Scout is an autonomous, transparent buying agent. Its first vertical is moving companies: it gathers a complete move brief once, discovers businesses, captures comparable itemized totals, negotiates honestly with verified leverage, flags risk, and recommends a shortlist backed by call evidence.

For the moving pilot, a market reference is not fabricated: it begins empty and
is calculated from completed, non-high-risk Scout quotes in the current batch.
An external market-data provider can later augment this evidence, never replace
it with an unverified number.

## Hackathon flow

```text
Voice interview + document intake
              |
              v
     confirmed RequirementSpec
              |
              v
 discovery / candidate call list
              |
              v
 parallel ElevenLabs conversations
              |
              v
 structured CallOutcome + transcript evidence
              |
              v
 verified negotiation round
              |
              v
 normalised quotes + risk flags -> ranked Recommendation
```

## Responsibilities

| Boundary | Owns | Does not own |
| --- | --- | --- |
| `apps/web` | User confirmation, document upload handoff, activity feed, comparison and evidence views | Negotiation decisions or data normalisation |
| `apps/orchestrator` | Call state, candidate batches, outcome persistence, quote normalisation, ranking | Voice wording or UI components |
| `apps/voice-agents` | Intake and negotiator personas, tool invocation, disclosure and honesty policies | Database writes outside documented tools |
| `apps/simulated-market` | Distinct seller behaviours and deterministic demo scenarios | Production recommendation logic |
| `packages/contracts` | Stable shared data shapes and event names | Provider-specific implementation |
| `packages/vertical-config` | Vertical-specific fields, fee taxonomy, red flags, benchmarks, allowed levers | Application control flow |
| `packages/evals` | Golden-call fixtures and pass/fail checks | Live secrets or recordings |

## Hard safety and trust boundaries

- Scout identifies itself accurately when asked and acts only on behalf of the customer.
- Scout never invents inventory, availability, registrations, or competing offers.
- Scout never pays, signs, reserves, or makes a binding agreement.
- Any pre-visit payment request is flagged; risk scoring explains its evidence.
- A negotiation may cite only a quote that exists in a captured `CallOutcome`.

## Definition of an integrated demo

A single confirmed `MovingRequest` must be passed unchanged through three calls. All calls finish with a structured outcome. At least one subsequent negotiation references a verified competing bid and produces a changed term. The UI then shows comparable all-in costs, risks, a recommendation, and captured transcript evidence.
