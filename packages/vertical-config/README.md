# @scout/vertical-config

Vertical-specific configuration belongs here rather than in agent prompts or application code. The current demo profile is moving companies; the legacy real-estate profile remains only as a compatibility fixture.

- Intake taxonomy: origin, destination, date, inventory, floors/elevators, services, and budget.
- Fee taxonomy: base move price, packing, stairs, long carry, fuel, insurance, storage, and other fees.
- Risk rules: hostage-load pressure, non-binding totals, and payment demands before delivery.
- Negotiation rules: verified leverage only, bounded counter rounds, and no authority to commit funds.

---

## Phase 0 delivered

- `src/vertical.config.json` — the single swappable config: `currency`,
  `effective_cost_formula`, `red_flag_threshold_percent` (30), `fraud_rules`,
  `leverage_types`, `benchmark_source` (`tavily`), and `seller_personas`.
- `src/index.js` — exports the config as default plus named fields.

```js
import config, { red_flag_threshold_percent, fraud_rules } from '@scout/vertical-config';
```

**Adding another vertical** means adding a profile and selecting it through
`getVerticalProfile()`; shared contracts and strategy code remain unchanged.

