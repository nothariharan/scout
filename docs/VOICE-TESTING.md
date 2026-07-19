# Scout voice-agent testing

Scout has two separate voice testing layers. Keep them separate: the first
tests Scout's deterministic negotiation brain; the second tests the deployed
ElevenLabs agent's conversational behaviour. Neither requires placing a phone
call.

## Test table in ElevenLabs

Run this from the repository root to create or refresh the four named tests in
the ElevenLabs **Tests** page:

```powershell
uv run --project tools/elevenlabs-mcp python apps/voice-agents/scripts/manage-elevenlabs-tests.py --sync
```

The table will contain:

| Test | What it proves |
| --- | --- |
| `interruption-and-de-escalation` | The agent can be interrupted, disclose AI status, stay concise, and obtain a callback. |
| `itemized-fee-pressure` | It asks for a binding itemised quote and never pays, reserves, or invents leverage. |
| `verified-leverage-only` | It cites only the supplied verified comparable and can confirm a concession. |
| `refusal-and-clean-exit` | It makes one last clarification, then exits calmly without accepting a deposit. |

For a probabilistic run (three independent runs per scenario), use:

```powershell
uv run --project tools/elevenlabs-mcp python apps/voice-agents/scripts/manage-elevenlabs-tests.py --sync --run --repeat 3
```

This consumes ElevenLabs Agent Testing credits but never dials a phone. Review
the generated transcripts, pass rate, and failure buckets in **Scout
Negotiator - Moving > Tests**. Treat anything below 80% as a prompt/config
regression; investigate a single failure even when the pass rate is green.

## Local gate: run before every agent change

```powershell
pnpm --filter @scout/contracts test
pnpm --filter @scout/evals test
pnpm --filter @scout/simulated-market test
pnpm --filter @scout/orchestrator test
```

These tests do not need API keys or credits. They check quote normalisation,
fraud flags, truthful leverage, strategy limits, report evidence, and the
telephony safety gate.

## Voice behaviour configured in ElevenLabs

Run the provisioner after changing `provision-elevenlabs-agents.py`:

```powershell
uv run --project tools/elevenlabs-mcp python apps/voice-agents/scripts/provision-elevenlabs-agents.py
```

The negotiator uses ElevenLabs interruption events, `turn_v3`, normal turn
eagerness, a three-second soft timeout, expressive conversational TTS, and the
`skip_turn` system tool. In practice this means a person can barge in, the
agent stops rather than talking over them, and it waits quietly when a
dispatcher says they are checking a price. “More forceful” means a controlled
`[firm]` or `[measured]` delivery on one factual sentence—not aggression,
threats, or a fabricated deadline.

## Last gate: one consented call only

Only after the local suite and the Tests table pass should you enable an
outbound call. Use a number you own or have explicit permission to call; do
not call real businesses while testing. A live callback requires a public HTTPS
orchestrator URL, an agent-tool secret, `OUTBOUND_CALLS_ENABLED=true`, and
recording consent before `CALL_RECORDING_ENABLED=true`. Re-run the provisioner
after the public URL and secret exist so the quote, leverage, strategy, and
outcome webhook tools are attached.
