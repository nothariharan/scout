// initiation-data.js
// Build ElevenLabs `conversation_initiation_client_data` (dynamic variables)
// from the confirmed RequirementSpec, so the SAME spec is reused verbatim on
// every call. Passed into the outbound-call API and returned by the
// personalization webhook.
// Grounded in:
// https://elevenlabs.io/docs/eleven-agents/customization/personalization

/**
 * @param {object} requirement - RequirementSpec
 * @param {object} [ctx]
 * @param {string|null} [ctx.callId]
 * @param {string|null} [ctx.listingId]
 * @returns {{type:string, dynamic_variables:object}}
 */
export function buildInitiationData(requirement = {}, { callId = null, listingId = null } = {}) {
  const location = requirement.location ?? {};
  const budget = requirement.budget ?? {};

  // dynamic_variables must be flat scalars ({{ var }} placeholders in prompts).
  const dynamic_variables = pruneEmpty({
    call_id: callId,
    listing_id: listingId,
    deal_type: requirement.deal_type,
    area: location.area,
    city: location.city,
    pincode: location.pincode,
    budget_ideal: budget.ideal,
    budget_ceiling: budget.ceiling,
    currency: budget.currency,
    occupancy: requirement.occupancy,
    furnishing: requirement.furnishing,
    move_in_date: requirement.move_in_date,
    lease_duration_months: requirement.lease_duration_months,
    negotiation_posture: requirement.negotiation_posture,
    language: requirement.language_pref ?? 'en',
    amenities: Array.isArray(requirement.amenities) ? requirement.amenities.join(', ') : undefined,
    deal_breakers: Array.isArray(requirement.deal_breakers) ? requirement.deal_breakers.join('; ') : undefined,
  });

  return { type: 'conversation_initiation_client_data', dynamic_variables };
}

function pruneEmpty(obj) {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') out[key] = value;
  }
  return out;
}
