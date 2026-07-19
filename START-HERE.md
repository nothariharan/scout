# START HERE — Scout project zip

Welcome. This archive is the **Scout** codebase for ElevenLabs Hack-Nation  
**Challenge 1 — The Negotiator**.

Live demo: https://scout-dusky-six.vercel.app  
GitHub: https://github.com/nothariharan/scout  
Demo video + bargaining audio: [`media/demo/`](media/demo/) (also linked at the top of `README.md`)

---

## 1. How to open this zip

1. Unzip into a folder (e.g. `Desktop/Scout`).
2. Open that folder in **VS Code / Cursor**.
3. Read this file first (`START-HERE.md`).
4. Then open `README.md` for product + run commands.
5. Then open `docs/ARCHITECTURE.md` for system design.

**Do not** commit or share a real `.env` with API keys. Use `.env.example` as the template.

---

## 2. What Scout is (30 seconds)

Scout is an autonomous **voice buying agent**. It:

1. Confirms one service brief (`RequirementSpec`)
2. Discovers providers (OpenStreetMap)
3. Calls them with ElevenLabs voice agents (Twilio outbound)
4. Negotiates only with **verified** competing quotes
5. Ranks an evidence-backed recommendation

It never invents competitor prices and never pays / signs for the customer.

---

## 3. How to read the codebase (recommended order)

Follow this path so the repo makes sense quickly:

| Step | Open | Why |
| --- | --- | --- |
| 1 | `START-HERE.md` (this file) | Orientation |
| 2 | `README.md` | Product + local run |
| 3 | `docs/ARCHITECTURE.md` | End-to-end flow + boundaries |
| 4 | `docs/technical-architecture.md` | Stack + assembly |
| 5 | `docs/negotiation-engine.md` | Verified leverage + strategy engine |
| 6 | `docs/voice-and-multilingual.md` | ElevenLabs / Hindi / accent |
| 7 | `docs/hack-nation-submission.md` | Form copy / judge narrative |
| 8 | `packages/contracts/` | Shared data shapes (source of truth) |
| 9 | `apps/orchestrator/src/` | Call lifecycle + strategy |
| 10 | `apps/voice-agents/src/agents/` | Negotiator + Intake prompts |
| 11 | `apps/web/src/app/` | UI routes (intake → discover → calls → report) |
| 12 | `apps/simulated-market/` | Repeatable seller scenarios (no phone credits) |

### Mental model

```text
apps/web          → what the user sees
apps/orchestrator → brain (strategy, quotes, ranking)
apps/voice-agents → what the agent says on the phone
apps/simulated-market → fake sellers for demos/tests
packages/*        → shared schemas + vertical rules
docs/*            → how/why
```

**Hard rule in code:** the voice LLM speaks; the orchestrator decides tactics and what numbers are allowed to be cited.

---

## 4. Folder map

```text
Scout/
├── START-HERE.md          ← you are here
├── README.md
├── apps/
│   ├── web/               Next.js UI (Vercel)
│   ├── orchestrator/      Node HTTP API (:8787)
│   ├── voice-agents/      ElevenLabs prompts + provision scripts
│   └── simulated-market/  Deterministic counterparties
├── packages/
│   ├── contracts/         RequirementSpec, Quote, CallOutcome…
│   ├── vertical-config/   Moving / hostel / renovation rules
│   └── evals/             Golden-call fixtures
├── docs/                  Architecture + Hack-Nation docs
├── .env.example           Env template (no secrets)
└── pnpm-workspace.yaml    Monorepo definition
```

---

## 5. Run locally (after unzip)

Needs: **Node 20+**, **pnpm 10**.

```bash
pnpm install
pnpm --filter @scout/orchestrator serve
pnpm --filter @scout/web dev
```

Open http://localhost:3000

No-credit smoke path (no Twilio / ElevenLabs burn):

```bash
node apps/simulated-market/src/simulator.smoke.js
node apps/orchestrator/src/moving/moving-workflow.smoke.js
```

Copy `.env.example` → `.env` and fill keys only if you want live voice / outbound calls.

---

## 6. Key files for judges / reviewers

| Topic | File |
| --- | --- |
| Product one-liner + non-negotiables | `README.md` |
| Architecture diagram (text) | `docs/ARCHITECTURE.md` |
| Negotiation honesty model | `docs/negotiation-engine.md` |
| Agent prompts | `apps/voice-agents/src/agents/negotiator.md` |
| Strategy engine | `apps/orchestrator/src/negotiation/strategy-engine.js` |
| Seller styles | `apps/simulated-market/src/moving-scenarios.js` |
| Submission copy | `docs/hack-nation-submission.md` |
| 1-min tech video prompt | `docs/Gemini-Notebook.md` |

---

## 7. What was excluded from this zip

To keep the archive small and safe:

- `node_modules/` (reinstall with `pnpm install`)
- `.next/`, build caches, `__pycache__/`
- `.env` / `.env.*` secrets (never ship keys)
- `.git/` (history lives on GitHub)
- `.vercel/`, local state under `data/local/`
- Large optional media / duplicate drafts when present

---

## 8. Team / challenge

- Event: Hack-Nation event 6  
- Challenge: The Negotiator — voice agents that call, compare, and haggle  
- Project Team ID: `HN-1602`  
- Verticals: moving (core) + India hostel/PG multilingual demo path  

Questions about layout → start at `docs/ARCHITECTURE.md`.  
Questions about “how does it haggle honestly?” → `docs/negotiation-engine.md`.
