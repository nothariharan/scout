# Scout — Voice Agents, Multilingual & Accent

## Two agents

| Agent | Job |
| --- | --- |
| **Intake Concierge** | Gather / confirm the brief into a frozen `RequirementSpec` |
| **Negotiator** | Call providers, itemize, haggle with verified leverage, exit cleanly |

Both live under `apps/voice-agents` and are provisioned into ElevenLabs via scripts.

## Voice stack

- Platform: ElevenLabs Conversational AI
- Realtime speech-to-text
- Low-latency TTS (Flash family)
- Turn-taking / interruption support
- System tools: `language_detection`, `skip_turn`, `end_call`
- Mid-call custom tools hit the Scout orchestrator over HTTPS

## Multilingual behavior (India demo path)

Scout’s sharp live demo is Hindi-first hostel / PG negotiation:

- Default language: Hindi (`hi`)
- Alternate: Indian English
- `language_detection` switches when the seller switches
- Strict rule: **one language per turn** (no messy mid-sentence soup unless intentional Hinglish policy)
- Indian-accent voice selection (Viraj / hi-IN path in provisioner)
- Language preference can ride on `RequirementSpec` (`language_pref`) and per-call `seller_language`

Goal: the seller should feel like they are talking to a competent local buyer — not a US-English call center bot reading a script.

## Accent & delivery

What matters on the phone:

- Indian English rhythm and Hindi clarity
- Short turns (telephony hates monologues)
- Interruptibility — sellers talk over agents; Scout handles barge-in
- Natural disclosure: if asked “are you AI?”, answer honestly without derailing the quote

## Conversation policies

The negotiator is trained / prompted to:

- request itemized costs, not vague totals
- refuse to invent competitor quotes
- pull leverage from tools before citing numbers
- de-escalate when climate turns annoyed
- verify urgency claims instead of folding to fake scarcity
- end the call cleanly when outcome is logged

## Telephony path

```text
Orchestrator (gated)
   → ElevenLabs outbound Conversational AI
      → Twilio call to seller
         → realtime audio + tools
            → structured outcome back into Scout
```

Outbound is opt-in. Local demos can use the simulated market instead.

## Why multilingual is product, not polish

In India hostel / rental markets, English-only agents lose trust and lose deals. Matching language and accent is part of negotiation effectiveness — same as citing real competing rents. Scout treats both as first-class: evidence for numbers, localization for voice.

## Testing

ElevenLabs agent tests cover interruption, itemization, verified-leverage discipline, and clean exit. Provision scripts sync those tests with the live agents so regressions show up before the judge demo.
