import assert from 'node:assert/strict';
import { assessRenovationRisk, normalizeRenovationQuote, rankRenovationQuotes } from './renovation-quote.js';
const transparent = { ...normalizeRenovationQuote({ vendor_id: 'paint_a', labor: 40000, materials: 25000, transport: 3000, warranty_months: 24, timeline_days: 7, scope_complete: true, binding_total: 68000 }), ...assessRenovationRisk({}, '') };
const unsafe = { ...normalizeRenovationQuote({ vendor_id: 'paint_b', labor: 30000, materials: 20000, binding_total: 50000, transcript: 'full payment upfront and cash only', scope_complete: false }), ...assessRenovationRisk({ scope_complete: false }, 'full payment upfront and cash only') };
const ranked = rankRenovationQuotes([unsafe, transparent], { budget: { ceiling: 75000 } });
assert.equal(ranked[0].vendor_id, 'paint_a'); assert.equal(ranked[1].risk_flag, 'high_risk');
console.log('renovation-quote.smoke.js: project totals, scope and unsafe payment risks rank correctly');
