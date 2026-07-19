// elevenlabs-telephony.js
// Place outbound agent calls. Scout runs the conversation on ElevenLabs Agents,
// which bridges to Twilio natively — so we call the ElevenLabs outbound-call API
// rather than Twilio's REST directly. Grounded in:
//   https://elevenlabs.io/docs/api-reference/twilio/outbound-call
//   https://elevenlabs.io/docs/api-reference/batch-calling/create

const ELEVENLABS_API = 'https://api.elevenlabs.io';

/**
 * Place one outbound call via ElevenLabs -> Twilio.
 * @param {object} args
 * @param {string} args.toNumber - destination phone number
 * @param {string} [args.agentId] - defaults to ELEVENLABS_NEGOTIATOR_AGENT_ID
 * @param {string} [args.agentPhoneNumberId] - defaults to ELEVENLABS_AGENT_PHONE_NUMBER_ID
 * @param {object} [args.initiationData] - conversation_initiation_client_data
 * @param {boolean} [args.recording]
 * @returns {Promise<{placed:boolean, conversationId?:string, callSid?:string, reason?:string, message?:string}>}
 */
export async function placeCall({ toNumber, agentId, agentPhoneNumberId, initiationData, recording = true } = {}) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const resolvedAgent = agentId ?? process.env.ELEVENLABS_NEGOTIATOR_AGENT_ID;
  const resolvedPhone = agentPhoneNumberId ?? process.env.ELEVENLABS_AGENT_PHONE_NUMBER_ID;

  if (!apiKey || !resolvedAgent || !resolvedPhone) {
    return {
      placed: false,
      reason: 'elevenlabs telephony not configured (ELEVENLABS_API_KEY / ELEVENLABS_NEGOTIATOR_AGENT_ID / ELEVENLABS_AGENT_PHONE_NUMBER_ID)',
    };
  }
  if (!toNumber) return { placed: false, reason: 'missing destination number' };

  try {
    const res = await fetch(`${ELEVENLABS_API}/v1/convai/twilio/outbound-call`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'xi-api-key': apiKey },
      body: JSON.stringify({
        agent_id: resolvedAgent,
        agent_phone_number_id: resolvedPhone,
        to_number: toNumber,
        call_recording_enabled: recording,
        ...(initiationData ? { conversation_initiation_client_data: initiationData } : {}),
      }),
    });
    if (!res.ok) return { placed: false, reason: `elevenlabs ${res.status}` };
    const data = await res.json();
    return {
      placed: Boolean(data.success),
      conversationId: data.conversation_id ?? null,
      callSid: data.callSid ?? null,
      message: data.message,
    };
  } catch (err) {
    return { placed: false, reason: String(err) };
  }
}

/**
 * Submit a batch of outbound calls (ElevenLabs batch calling).
 * @param {object} args
 * @param {string} [args.callName]
 * @param {string} [args.agentId]
 * @param {object[]} [args.recipients] - recipient objects per the batch API
 * @returns {Promise<{submitted:boolean, batch?:object, reason?:string}>}
 */
export async function placeBatch({ callName, agentId, recipients = [] } = {}) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const resolvedAgent = agentId ?? process.env.ELEVENLABS_NEGOTIATOR_AGENT_ID;

  if (!apiKey || !resolvedAgent) {
    return { submitted: false, reason: 'elevenlabs not configured (ELEVENLABS_API_KEY / ELEVENLABS_NEGOTIATOR_AGENT_ID)' };
  }

  try {
    const res = await fetch(`${ELEVENLABS_API}/v1/convai/batch-calling/submit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'xi-api-key': apiKey },
      body: JSON.stringify({ call_name: callName ?? 'scout-batch', agent_id: resolvedAgent, recipients }),
    });
    if (!res.ok) return { submitted: false, reason: `elevenlabs ${res.status}` };
    return { submitted: true, batch: await res.json() };
  } catch (err) {
    return { submitted: false, reason: String(err) };
  }
}
