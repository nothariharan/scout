# Gemini Notebook LM — Tech Video Prompt

Upload these Scout docs into Gemini Notebook LM as sources first:

1. `docs/project-overview.md`
2. `docs/technical-architecture.md`
3. `docs/negotiation-engine.md`
4. `docs/voice-and-multilingual.md`
5. `docs/hack-nation-submission.md`
6. (optional) `docs/ARCHITECTURE.md`, `README.md`

Then paste the prompt below into Notebook LM (Audio Overview / Video / custom brief — whichever UI you use for a generated explainer). Goal: **one tight ~60 second technical video** for Hack-Nation “Tech Video”.

---

## PROMPT (copy everything below this line)

```text
You are producing a ONE-MINUTE technical explainer video script and narration for Scout, an autonomous voice buying agent built for the ElevenLabs Hack-Nation challenge “The Negotiator.”

STRICT LENGTH
- Total spoken runtime: 55–65 seconds. Hard cap 70 seconds.
- No intro logos speech, no “welcome to this video,” no outro CTA spam.
- Start mid-action. End on the evidence loop.

AUDIENCE
Hackathon judges and technical reviewers who already know what voice agents are. Do not explain what an API is. Explain how Scout is assembled and why the architecture is trustworthy.

TONE
Clear, fast, confident builder voice. Concrete systems language. No hype adjectives (“revolutionary,” “seamless,” “cutting-edge”). No music-bed instructions in the spoken script — only narration.

WHAT THE VIDEO MUST COVER (in this order)

1) Hook (0–8s)
   Scout is not a chatbot that “sounds good on the phone.” It is an autonomous buyer that calls providers, compares itemized quotes, and haggles only with verified competing bids.

2) Pipeline (8–25s)
   Explain the assembly line in one breath:
   confirmed RequirementSpec → OpenStreetMap discovery → parallel ElevenLabs voice calls (Twilio outbound) → orchestrator tools mid-call → normalized quotes + risk flags → ranked recommendation with transcript evidence.

3) Trust architecture (25–42s)
   Emphasize the split:
   - Deterministic strategy engine decides the next negotiation move
   - Voice LLM (ElevenLabs + Gemini/Claude) only speaks it
   - Leverage endpoint returns only real captured CallOutcomes — never invented competitor prices
   - Scout never pays, signs, or binds the customer

4) Multilingual + demo proof (42–55s)
   Hindi-first / Indian-English negotiator with language detection for India hostel/PG demos; simulated market with four seller styles makes the same contract testable without burning phone credits.

5) Close (55–60s)
   One sentence: Scout closes the evidence loop — call, capture, verify, haggle, recommend.

MUST INCLUDE THESE TECH NAMES (naturally, not as a laundry list)
ElevenLabs, Next.js, Node orchestrator, OpenStreetMap, Twilio, verified leverage, strategy engine, simulated market

OPTIONAL TO MENTION IF TIME
Tavily benchmarks, pnpm monorepo, SSE live UI, vertical-config

DO NOT INCLUDE
- Pricing, fundraising, team bios
- Long moving-industry sob stories
- Step-by-step UI click tour (that is the Demo Video, not this Tech Video)
- Fake metrics or claims not in the source docs
- AWS Bedrock (not in this codebase)

OUTPUT FORMAT
1) Spoken narration script with approximate timestamps
2) On-screen text beats (max 6 short phrases) synced to timestamps
3) Suggested visual sequence (architecture diagram → call flow → leverage guard → ranked report) — still image / diagram friendly for Notebook LM
4) One alternate 15-word title card: “Scout — Evidence-Backed Voice Negotiation”

If any detail is missing from sources, omit it. Prefer accuracy over completeness.
```

---

## How to use Notebook LM for the Hack-Nation Tech Video

1. Create a new notebook named `Scout Tech Video`
2. Upload the markdown files listed above as sources
3. Paste the prompt into Chat / custom Audio Overview instructions
4. Generate Audio Overview or Video Overview (whichever your Gemini Notebook LM UI offers)
5. Export / download the ~1 minute result as **MP4 (H.264)** if possible
6. Watch once: confirm it mentions verified leverage + strategy engine + ElevenLabs
7. Upload that file into Hack-Nation field **2. Tech Video (max 60 sec)**

If the generated audio runs long, regenerate with this add-on sentence at the top of the prompt:

```text
Cut 20%. Kill every adjective. Keep only architecture and trust boundary.
```

---

## Fallback 60-second narration (if Notebook LM is unavailable)

Use this as a teleprompter / TTS script:

> Scout is an autonomous buyer for ElevenLabs’ Negotiator challenge. One confirmed brief becomes OpenStreetMap discovery, then parallel voice calls through ElevenLabs and Twilio. Mid-call, agents hit our Node orchestrator — log the quote, pull verified leverage, ask the strategy engine for the next move. The voice model speaks; it never invents competitor prices. Quotes get normalized, risk-flagged, and ranked with transcript evidence in a Next.js UI. Hindi-first negotiation handles India hostel demos; a simulated market with four seller styles proves the same contract without burning credits. Scout never pays or signs. It closes the evidence loop: call, capture, verify, haggle, recommend.

~(≈58 seconds at a brisk technical pace)
