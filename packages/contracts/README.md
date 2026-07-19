# @scout/contracts

This package will contain the versioned, provider-neutral shared schemas. Establish these first:

- `RequirementSpec`: confirmed housing requirements and deal-breakers.
- `CandidateListing`: discovered listing plus source and contact details.
- `CallOutcome`: `itemized_quote`, `callback_scheduled`, or `declined`, with evidence references. Provider errors are operational events and do not become a customer-facing outcome.
- `Quote`: normalised base rent/price, deposit, maintenance, brokerage, amenities, and terms.
- `RiskFlag`: severity, rule, and evidence.
- `Recommendation`: ranked options with plain-language reasoning and evidence links.

Do not add a schema change without a matching fixture in `packages/evals`.

---

## Phase 0 delivered (frozen contract)

The following are now shipped in `src/`:

- `src/schemas/requirement_spec.json` — `RequirementSpec`
- `src/schemas/quote.json` — `Quote` (embeds `call_outcome` via `$ref`)
- `src/schemas/call_outcome.json` — `CallOutcome`
- `src/effective_cost.js` — `effectiveMonthlyCost(quote)` (pure ranking number)
- `src/red_flag.js` — `riskFlag(quote, benchmark, thresholdPercent)`
- `src/index.js` — barrel export of the scoring functions

Import functions from `@scout/contracts`; import schemas by path, e.g.
`@scout/contracts/schemas/quote.json`.

```bash
pnpm --filter @scout/contracts test   # runs the two lib self-tests
```

**Still to define (from the list above):** `CandidateListing`, `RiskFlag` (as a
standalone evidence object), and `Recommendation`.

> **⚠️ Open team decision — `CallOutcome` statuses.** This README lists four
> (`quote / callback / decline / error`); the Phase 0 draft schema ships three
> product endings (`itemized_quote / callback_scheduled / declined`). Agree the
> final set (and whether `error` is a call outcome or a transport-level failure)
> before freezing. **This is a frozen contract — do not change field names
> without telling the whole team.**

