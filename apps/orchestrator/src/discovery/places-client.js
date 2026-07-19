// places-client.js
// Build the call list from Google Places (business phone numbers within the
// target radius) — the challenge's "call list, built programmatically instead of
// by hand". Geofencing to the commute constraint happens BEFORE any call is
// placed, so we never dial out-of-range listings.
// TODO(person-b): implement Places Nearby Search + Distance Matrix commute filter.

/**
 * @param {object} args
 * @param {object} args.location - { lat, lng, area, city, pincode }
 * @param {number} [args.radiusMeters]
 * @param {string} [args.dealType]
 * @param {number} [args.limit]
 * @returns {Promise<{available:boolean, candidates:object[]}>}
 */
export async function discoverCandidates({
  location,
  radiusMeters = 4000,
  dealType = 'pg',
  limit = 10,
} = {}) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return { available: false, candidates: [] };
  }

  // TODO(person-b):
  //  1. Places Nearby Search around location within radiusMeters for dealType.
  //  2. Distance Matrix from each result to the commute reference point.
  //  3. Drop anything over commute_constraint.max_minutes, cap to `limit`.
  //  4. Return [{ listing_id, listing_name, phone, lat, lng, commute_minutes }].
  return { available: true, candidates: [] };
}
