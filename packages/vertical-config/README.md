# @scout/vertical-config

Real-estate-specific configuration belongs here rather than in agent prompts or application code:

- Intake taxonomy: rent, PG/hostel, purchase; budget, move-in, commute, occupancy, furnishing, amenities, and deal-breakers.
- Fee taxonomy: base rent, deposit, maintenance, brokerage, parking, utilities, food, and one-time charges.
- Risk rules: pre-visit payment, identity mismatch, missing registration details, duplicate listing clues, and pressure tactics.
- Negotiation rules: allowed verified-leverage claims, benchmark comparisons, and escalation limits.

---

## Phase 0 delivered

- `src/vertical.config.json` — the single swappable config: `currency`,
  `effective_cost_formula`, `red_flag_threshold_percent` (30), `fraud_rules`,
  `leverage_types`, `benchmark_source` (`tavily`), and `seller_personas`.
- `src/index.js` — exports the config as default plus named fields.

```js
import config, { red_flag_threshold_percent, fraud_rules } from '@scout/vertical-config';
```

**Switching Scout to another vertical (e.g. moving) means editing ONLY this
file** — the `@scout/contracts` schemas and scoring functions stay untouched.
Field names here are a contract; change values, not names.

