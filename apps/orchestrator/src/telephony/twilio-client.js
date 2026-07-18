// twilio-client.js
// Place outbound calls via Twilio (or SIP). In Scout the ElevenLabs agent runs
// the conversation; Twilio provides the dial-out + recording. This is the
// boundary with Person A's voice stack: the orchestrator triggers the batch and
// tracks call state, the agent handles the audio.
// TODO(person-b + person-a): wire ElevenLabs batch calling / Twilio dial-out.

/**
 * Place a single outbound call. Reads TELEPHONY_* credentials from env.
 * @returns {Promise<{placed:boolean, sid?:string, reason?:string}>}
 */
export async function placeCall({ to, from, agentId, metadata } = {}) {
  const sid = process.env.TELEPHONY_ACCOUNT_SID;
  const token = process.env.TELEPHONY_AUTH_TOKEN;
  if (!sid || !token) {
    return { placed: false, reason: 'telephony credentials not configured' };
  }
  if (!to) {
    return { placed: false, reason: 'missing destination number' };
  }

  // TODO(person-b + person-a): Twilio REST create-call, bridge to the ElevenLabs
  // agent (agentId), enable recording, and map the Twilio call SID to a
  // call-session id so mid-call tools can write into the right session.
  return { placed: false, reason: 'not implemented' };
}

/** Fire a batch of outbound calls in parallel (the challenge's batch calling). */
export async function placeBatch(calls = []) {
  return Promise.all(calls.map((call) => placeCall(call)));
}
