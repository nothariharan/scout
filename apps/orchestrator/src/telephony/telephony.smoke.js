import assert from 'node:assert/strict';
import { placeCall } from './twilio-client.js';

const result = await placeCall({ to: '+15555550123' });
assert.equal(result.placed, false);
assert.equal(result.reason, 'outbound calling is disabled');
console.log('Telephony safety gate verified; no call placed.');
