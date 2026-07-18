# @scout/contracts

This package will contain the versioned, provider-neutral shared schemas. Establish these first:

- `RequirementSpec`: confirmed housing requirements and deal-breakers.
- `CandidateListing`: discovered listing plus source and contact details.
- `CallOutcome`: `quote`, `callback`, `decline`, or `error`, with evidence references.
- `Quote`: normalised base rent/price, deposit, maintenance, brokerage, amenities, and terms.
- `RiskFlag`: severity, rule, and evidence.
- `Recommendation`: ranked options with plain-language reasoning and evidence links.

Do not add a schema change without a matching fixture in `packages/evals`.

