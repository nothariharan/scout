# Agent Tools — ElevenLabs ↔ Orchestrator contract

How Person A's ElevenLabs agents talk to Person B's backend (`@scout/orchestrator`).
Everything here maps to endpoints that already exist and are self-tested
(`node apps/orchestrator/src/server/api.smoke.js`).

Grounded in the ElevenLabs Agents docs:
- Server / webhook tools: <https://elevenlabs.io/docs/eleven-agents/customization/tools/server-tools>
- Webhook tool config: <https://elevenlabs.io/docs/eleven-agents/customization/tools/webhook-tools>
- Twilio call personalization: <https://elevenlabs.io/docs/eleven-agents/phone-numbers/twilio-integration/customising-calls>

## The shape of the integration

ElevenLabs **webhook (server) tools** let the agent make HTTP calls mid-conversation;
the tool's JSON response is added back into the conversation context. We expose
three tools plus one call-start personalization webhook.

```
call start ─▶ [personalization webhook] ─▶ returns dynamic_variables { call_id, spec... }
   │
   ├─ during call ─▶ log_quote   (POST /calls/{{call_id}}/quote)     write fields as heard
   ├─ during call ─▶ get_leverage (GET  /calls/{{call_id}}/leverage) real numbers to cite
   └─ at hang-up  ─▶ record_outcome (POST /calls/{{call_id}}/outcome) structured ending
```

Base URL in dev: `http://<host>:8787` (run `npm --filter @scout/orchestrator run serve`).

## Call start — personalization webhook (injects `call_id` + the job spec)

When a call connects, ElevenLabs POSTs to your configured personalization webhook.
Return `conversation_initiation_client_data` so the agent gets `dynamic_variables`
(the confirmed `RequirementSpec`, reused verbatim across every call) and the
`call_id` used in tool paths:

```json
{
  "type": "conversation_initiation_client_data",
  "dynamic_variables": {
    "call_id": "call_42",
    "deal_type": "pg",
    "area": "Koramangala",
    "budget_ceiling": 16000,
    "lease_duration_months": 12
  }
}
```

> Person B provides this endpoint (create the call-session first, then return its
> `call_id`). Person A points the agent's personalization webhook at it.

## Tool 1 — `log_quote` (write structured fields DURING the call)

The agent calls this every time the seller states a number — not after the call.
Partial writes are merged; unknown fields are ignored.

- **Method / URL:** `POST {{base}}/calls/{{call_id}}/quote`
- **Body params** (all optional; send what you just heard):
  `base_rent`, `deposit`, `maintenance_monthly`, `brokerage_onetime`,
  `hidden_charges`, `lease_duration_months`, `amenities_included`,
  `first_quoted_effective`, `final_quoted_effective`, `price_moved`,
  `commute_minutes`, `seller_language`, `transcript_append`
- **Returns:** the updated session (state `in_progress`).

ElevenLabs webhook tool config (per the webhook-tools docs):

```json
{
  "type": "webhook",
  "name": "log_quote",
  "description": "Record a fee the seller just stated. Call it the moment you hear rent, deposit, maintenance, or brokerage — never wait until the call ends.",
  "api_schema": {
    "url": "https://{{system__env_api_host}}/calls/{{call_id}}/quote",
    "method": "POST",
    "request_body_schema": {
      "type": "object",
      "properties": {
        "base_rent": { "type": "number" },
        "deposit": { "type": "number" },
        "maintenance_monthly": { "type": "number" },
        "brokerage_onetime": { "type": "number" }
      }
    }
  }
}
```

## Tool 2 — `get_leverage` (real numbers the Negotiator may cite)

Before countering on price, the agent asks the backend what leverage is real.

- **Method / URL:** `GET {{base}}/calls/{{call_id}}/leverage`
- **Returns:**

```json
{
  "leverage": [
    { "type": "comparable_unit", "value": 15500, "evidence": { "listing_id": "pg_a", "listing_name": "Zolo Nest" } },
    { "type": "benchmark", "value": 14000, "source": "tavily" },
    { "type": "fee_attack", "target_fee": "deposit", "monthly_impact": 1833.33 }
  ]
}
```

> **Honesty line, enforced in code:** this endpoint only ever returns numbers
> from *confirmed itemized, non-fraud* quotes plus the real Tavily benchmark. The
> agent physically cannot be handed an invented competing bid. Prompt the agent
> to cite only what this tool returns ("I have a comparable at ₹15,500").

## Tool 3 — `record_outcome` (every call ends structured)

- **Method / URL:** `POST {{base}}/calls/{{call_id}}/outcome`
- **Body:** `{ "status": "itemized_quote" | "callback_scheduled" | "declined", "reason": "...", "callback_at": "<ISO8601>" }`
  - `reason` required for `callback_scheduled` and `declined`.
- **Returns:** the finalized session + the normalized, risk-assessed quote.

## Reporting (Person C)

- `GET {{base}}/report` → `{ ranked, recommendation, benchmark }` — all quotes
  ranked (high_risk never #1), each with `effective_monthly_cost`, `risk_flag`,
  `fraud_signals`, `call_outcome`, and price-drop fields.

## The four Conversation Requirement points (where each lives)

| Requirement | Where |
| --- | --- |
| AI disclosure / "are you a robot?" | agent system prompt (Person A) |
| Survive friction (barge-in, evasive) | agent turn-taking config (Person A) |
| Honesty line (no invented bids) | `get_leverage` returns only real data (Person B, enforced) |
| Every call ends structured | `record_outcome` → 3 outcomes (Person B) |
