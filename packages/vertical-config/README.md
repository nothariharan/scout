# @scout/vertical-config

This package keeps vertical-specific behavior out of prompts and orchestration
code. The current product path selects the moving-company profile explicitly.

## Current profiles

- `src/profiles/moving.config.json` — moving intake fields, itemized price
  model, hostage-load and non-binding-quote risks, and bounded negotiation
  policy.
- `src/vertical.config.json` — legacy real-estate profile retained for older
  fixture coverage only.

Select a profile deliberately for a product workflow:

```js
import { getVerticalProfile } from '@scout/vertical-config';

const moving = getVerticalProfile('moving');
const legacyRealEstate = getVerticalProfile('real_estate_pg');
```

To add a new vertical, add a profile and register it in `src/index.js`. Shared
contracts and the deterministic negotiation engine should not need a rewrite.
