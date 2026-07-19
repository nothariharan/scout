# Scout agent tools — ElevenLabs ↔ orchestrator

Scout's moving negotiator does not decide a deal by itself. The deterministic
Negotiation Engine chooses the next tactic; the voice agent asks questions,
records what it hears, and verbalizes only that reviewed action.

## Required deployment boundary

ElevenLabs can call webhook tools only over a publicly reachable HTTPS URL.
`localhost:8787` is useful for the smoke tests but **cannot** be used for live
agent tools. Before enabling outbound calls, deploy the orchestrator and set:

```bash
SCOUT_PUBLIC_ORCHESTRATOR_URL=https://api.example.com
SCOUT_AGENT_TOOL_SECRET=<a long, unique secret>
```

The same secret is sent by the configured `x-scout-agent-secret` request
header. The backend requires it whenever it is set. Keep both values in secret
stores, never in git or browser-visible environment variables.

Run the provisioner after those values are available:

```bash
uv run --project tools/elevenlabs-mcp python apps/voice-agents/scripts/provision-elevenlabs-agents.py
```

Without both values, the script deliberately leaves only the end-call tool on
the agent. It never places a telephone call.

## Mid-call tool contract

Every outbound dispatch creates the `call_id` and injects it as an ElevenLabs
dynamic variable. The Moving Negotiator then uses these paths:

| Tool | Method and path | When to use it |
| --- | --- | --- |
| `log_moving_quote` | `POST /calls/:call_id/quote` | Immediately after each factual fee, total, deposit, or binding-status statement. |
| `get_verified_leverage` | `GET /calls/:call_id/leverage` | Before a price counter; cite only returned comparisons. |
| `get_next_negotiation_action` | `POST /calls/:call_id/strategy` | Before changing tactics. The response is the authority for the next sentence. |
| `record_call_outcome` | `POST /calls/:call_id/outcome` | End every conversation as `itemized_quote`, `callback_scheduled`, or `declined`. |

`log_moving_quote` accepts partial values; the safe fields are `base_price`,
`packing`, `unpacking`, `stairs`, `long_carry`, `fuel`, `insurance`, `storage`,
`other_fees`, `deposit`, `first_quoted_total`, `binding_total`, `quote_status`,
`risk_signals`, `counter_rounds`, and `transcript_append`. Other keys are
discarded by the backend.

## Safety invariants

- The agent discloses that it is Scout's AI assistant and never makes payments,
  reservations, or binding commitments.
- A leverage response is built only from completed, non-high-risk moving quotes.
  A model cannot fabricate a competitor offer through this endpoint.
- A `binding_total` is a confirmed all-in total, not an estimate. The agent
  must ask for itemization when fees are unclear.
- Trial and simulated conversations use the same strategy and quote contracts;
  no phone call is needed to test negotiation behavior.

## Verification sequence

1. Run `node apps/orchestrator/src/moving/moving-workflow.smoke.js`.
2. Run ElevenLabs conversation simulations against the Moving Negotiator with
   transparent, fee-padder, hard-seller, and deposit-pressure scenarios.
3. Deploy a staging orchestrator, set the two secure values above, and run the
   provisioner.
4. Make a consented call to a verified test number with outbound calling
   explicitly enabled. Confirm quote writes, strategy lookup, outcome, and
   report ranking before dialing a business.
