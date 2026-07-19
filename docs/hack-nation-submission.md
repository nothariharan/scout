# Hack-Nation Submission — Scout (copy/paste)

Event: `hack-nation-event-6`  
Challenge: **Challenge 1 — The Negotiator: Voice Agents that Call, Compare, and Haggle**  
Project Team ID: `HN-1602`

Use this file as the source of truth when filling the dashboard form. Paste field-by-field.

---

## Project Title

Scout

---

## Short Description

Autonomous voice buying agent that gathers one confirmed service brief, calls multiple providers, haggles with verified competing quotes, and returns an evidence-backed ranked recommendation — starting with moving companies, with a live multilingual India hostel/PG demo.

---

## 1. Problem & Challenge

People shopping for high-friction local services (movers, hostels, contractors) waste hours calling vendors, comparing inconsistent quotes, and missing better terms because they negotiate one call at a time without shared leverage. Quotes are rarely itemized the same way, pressure tactics are hard to spot live, and buyers often accept the first “good enough” offer.

Scout tackles **The Negotiator** challenge: a voice agent that can call, compare, and haggle honestly — extracting comparable terms, citing only real competing bids, and producing a decision a human can trust.

It is also multilingual: the negotiator detects language, matches Indian English / Hindi delivery, and keeps one language per turn so the call feels natural to the seller.

---

## 2. Target Audience

- Consumers planning a move who want comparable all-in quotes without spending a day on the phone
- Busy households and remote buyers who need transparent negotiation, not a black-box “AI booked it for you”
- Students and newcomers searching hostels / PGs / rentals in a new city (India demo path)
- Longer term: anyone buying local home services (renovation, contractors) where the same call → compare → haggle loop applies

---

## 3. Solution & Core Features

Scout turns one confirmed brief into a full negotiation run:

- **Intake** — voice / document / text intake produces a confirmed `RequirementSpec` reused on every call
- **Discovery** — finds nearby candidates (OpenStreetMap for the moving pilot)
- **Parallel voice calls** — ElevenLabs negotiator agents request itemized costs, disclose AI role when asked, and handle friction
- **Verified leverage** — may cite only quotes already captured; never invents inventory or competing bids
- **Risk flags** — pressure tactics, non-binding quotes, pre-visit payment requests
- **Comparison + recommendation** — normalized quotes, ranked shortlist, transcripts / evidence in the UI

**Hard rule:** Scout never pays, signs, or binds the customer.

---

## 4. Unique Selling Proposition (USP)

Most “AI calling” demos talk. Scout closes the **evidence loop**.

Negotiation is constrained to verified leverage, quotes are normalized for apples-to-apples comparison, and the recommendation is tied to call outcomes and transcripts — not vibes. A simulated market with distinct seller styles makes the demo repeatable, and vertical config lets the same engine expand beyond moving without rewriting the core. Multilingual Hindi / Indian-English negotiation is wired into the live agent path, not bolted on as a slide claim.

---

## 5. Implementation & Technology

Monorepo (`pnpm`) with clear boundaries:

| App / package | Role |
| --- | --- |
| `apps/web` | Next.js 14 + React + ElevenLabs React — intake, live activity, comparison UI |
| `apps/orchestrator` | Call lifecycle, strategy engine, quote normalization, ranking, audit events |
| `apps/voice-agents` | Intake Concierge + Negotiator prompts / tools for ElevenLabs |
| `apps/simulated-market` | Counterparty agents and deterministic negotiation scenarios |
| `packages/contracts` | Shared schemas (`RequirementSpec`, `CallOutcome`, `Quote`, `Recommendation`) |
| `packages/vertical-config` | Moving (and other vertical) rules, red flags, negotiation levers |
| `packages/evals` | Golden-call fixtures |

**Stack tags:** ElevenLabs · Next.js · React · TypeScript · Node.js · OpenStreetMap · Twilio (via ElevenLabs outbound) · Tavily · OpenAI · Gemini · Claude · pnpm monorepo · voice agents · tool calling · SSE

Safety split: a deterministic **strategy engine** chooses the next tactic; the voice LLM only verbalizes it and may cite only `verified_leverage` from completed, non-high-risk quotes.

---

## 6. Results & Impact

In the hackathon build we delivered an end-to-end pilot: confirmed brief → multi-call negotiation → itemized comparable quotes → at least one evidence-based term/price change → ranked recommendation with provenance.

That proves a trustworthy autonomous buyer for The Negotiator challenge. Architecture is already extended toward related home-service verticals and a live India hostel / PG negotiation path with Hindi-first voice.

---

## Fun moment

While we were testing, Scout actually placed a call to a real hostel owner near my home. The agent was mid-bargain on a solid price — then I jumped in to explain it was a demo mistake. Proof it works. Slightly terrifying. Extremely fun.

---

## Live Project URL

> Paste your deployed demo URL here (Vercel / public tunnel).  
> Local/dev example used during build: orchestrator via public ngrok for ElevenLabs webhooks.  
> **Required before submit.**

Suggested format once live:

```text
https://YOUR-DEPLOYED-SCOUT-URL
```

---

## GitHub Repository URL

https://github.com/nothariharan/scout

---

## Technologies / Tags

ElevenLabs, React, Next.js, TypeScript, Node.js, Twilio, Tavily, OpenAI, Gemini, Claude, OpenStreetMap, pnpm, Voice Agents, Tool Calling, STT, TTS, Multi-Lingual, Fine-Tuning, Optimization, AI

---

## Additional Tags

Voice Agent, STT, TTS, Multi-Lingual, Fine-Tuning, Optimization, Verified Leverage, Negotiation, Simulated Market

---

## Additional Information (optional)

Scout separates **what to say** from **what is allowed to be true**.

- The orchestrator owns call state, strategy (`planNegotiation`), leverage (`/leverage`), and ranking.
- ElevenLabs agents own conversational delivery, interruption handling, language detection, and disclosure.
- The simulated market exercises the same strategy contract without burning phone credits — four seller styles: transparent operator, fee padder, hard seller, hostage-load risk.
- Outbound telephony is gated (`OUTBOUND_CALLS_ENABLED`); ElevenLabs routes calls through Twilio.
- Market reference starts empty and is computed from completed, non-high-risk quotes in the batch (Tavily can augment, never invent).

Non-negotiables for judges:

1. One confirmed spec reused across every call  
2. ≥3 counterparty styles  
3. Itemized comparable quotes  
4. Genuine price/term change from verified leverage  
5. Ranked recommendation with transcript evidence  
6. Honest AI disclosure; no fabricated bids; no authority to pay/sign  

---

## Checklist before Submit

- [ ] Team picture uploaded
- [ ] Demo video (≤60s) — UI/UX flow
- [ ] Tech video (≤60s) — architecture (use Notebook LM output from `Gemini-Notebook.md`)
- [ ] Team video (≤60s)
- [ ] Live project demo link filled
- [ ] GitHub URL: `https://github.com/nothariharan/scout`
- [ ] Challenge selected: The Negotiator
- [ ] Confirmation checkbox checked
- [ ] Team members (Account IDs) complete
