// Outbound calls are delegated to ElevenLabs Conversational AI. The configured
// ElevenLabs number is Twilio-backed, but Scout does not need to hold or use
// Twilio credentials to start a call.

const elevenLabsOutboundUrl = 'https://api.elevenlabs.io/v1/convai/twilio/outbound-call';

function getCallConfiguration(agentId) {
  return {
    apiKey: process.env.ELEVENLABS_API_KEY,
    agentId: agentId ?? process.env.ELEVENLABS_NEGOTIATOR_AGENT_ID,
    phoneNumberId: process.env.ELEVENLABS_AGENT_PHONE_NUMBER_ID,
  };
}

/**
 * Place one Scout-negotiator outbound call through ElevenLabs.
 *
 * Calls are intentionally opt-in: set OUTBOUND_CALLS_ENABLED=true only in a
 * controlled environment with a consented destination number. `metadata` is
 * passed as ElevenLabs dynamic variables so the agent can receive a reviewed
 * strategy brief without choosing a new negotiation tactic itself.
 */
export async function placeCall({ to, agentId, metadata } = {}) {
  if (process.env.OUTBOUND_CALLS_ENABLED !== 'true') {
    return { placed: false, reason: 'outbound calling is disabled' };
  }
  if (!to) {
    return { placed: false, reason: 'missing destination number' };
  }

  const { apiKey, agentId: resolvedAgentId, phoneNumberId } = getCallConfiguration(agentId);
  if (!apiKey || !resolvedAgentId || !phoneNumberId) {
    return { placed: false, reason: 'ElevenLabs call configuration is incomplete' };
  }

  const response = await fetch(elevenLabsOutboundUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      agent_id: resolvedAgentId,
      agent_phone_number_id: phoneNumberId,
      to_number: to,
      // Explicit consent gate: recordings are retained only when the deployed
      // environment enables them and local recording rules are satisfied.
      call_recording_enabled: process.env.CALL_RECORDING_ENABLED === 'true',
      ...(metadata && Object.keys(metadata).length > 0
        ? { conversation_initiation_client_data: { dynamic_variables: metadata } }
        : {}),
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) {
    return {
      placed: false,
      reason: result?.detail?.message ?? result?.message ?? `ElevenLabs returned HTTP ${response.status}`,
    };
  }

  return {
    placed: true,
    provider: 'elevenlabs',
    conversationId: result.conversation_id,
    sid: result.callSid,
  };
}

/** Fire a batch of outbound calls in parallel after each call passes the opt-in gate. */
export async function placeBatch(calls = []) {
  return Promise.all(calls.map((call) => placeCall(call)));
}
