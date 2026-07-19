// places-client.js
// Build the call list from Google Places (New) Nearby Search within the target
// radius — the challenge's "call list, built programmatically". Reads
// GOOGLE_PLACES_API_KEY from env; returns { available:false } without a key so
// the pipeline degrades gracefully.
// Grounded in: https://developers.google.com/maps/documentation/places/web-service/nearby-search

const PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places:searchNearby';
const FIELD_MASK =
  'places.id,places.displayName,places.nationalPhoneNumber,places.internationalPhoneNumber,places.location,places.formattedAddress';

// Map a Scout deal_type to Google Place types (Table A).
const TYPE_MAP = {
  pg: ['lodging'],
  short_stay_rental: ['lodging'],
};

/**
 * @param {object} args
 * @param {object} args.location - { lat, lng, ... } (lat/lng required for the circle)
 * @param {number} [args.radiusMeters]
 * @param {string} [args.dealType]
 * @param {number} [args.limit]
 * @returns {Promise<{available:boolean, candidates:object[], error?:string}>}
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

  const lat = Number(location?.lat);
  const lng = Number(location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { available: false, candidates: [], error: 'location.lat/lng required for nearby search' };
  }

  try {
    const res = await fetch(PLACES_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
        'x-goog-fieldmask': FIELD_MASK,
      },
      body: JSON.stringify({
        includedTypes: TYPE_MAP[dealType] ?? ['lodging'],
        maxResultCount: limit,
        locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters } },
      }),
    });
    if (!res.ok) {
      return { available: false, candidates: [], error: `places ${res.status}` };
    }
    const data = await res.json();
    const candidates = (data.places ?? []).map((p) => toCandidate(p, { lat, lng, dealType }));
    return { available: true, candidates };
  } catch (err) {
    return { available: false, candidates: [], error: String(err) };
  }
}

// Straight-line distance (km) for a lightweight geofence + display, no extra API call.
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
const toRad = (deg) => (deg * Math.PI) / 180;
const round1 = (n) => Math.round(n * 10) / 10;

// Map a Places result to a schema-conformant CandidateListing (omit empty optionals).
function toCandidate(p, { lat, lng, dealType }) {
  const candidate = {
    listing_id: p.id,
    listing_name: p.displayName?.text ?? '',
    source: 'google_places',
    deal_type: dealType,
  };
  const phone = p.nationalPhoneNumber ?? p.internationalPhoneNumber;
  if (phone) candidate.phone = phone;

  const plat = p.location?.latitude;
  const plng = p.location?.longitude;
  if (Number.isFinite(plat)) candidate.lat = plat;
  if (Number.isFinite(plng)) candidate.lng = plng;
  if (Number.isFinite(plat) && Number.isFinite(plng)) {
    candidate.distance_km = round1(haversineKm(lat, lng, plat, plng));
    candidate.commute_minutes = estimateCommuteMinutes(candidate.distance_km);
  }
  return candidate;
}

// Rough one-way commute estimate from straight-line distance (urban ~18 km/h).
// TODO(person-b): swap for the Google Distance Matrix API for real ETAs.
function estimateCommuteMinutes(distanceKm) {
  return Math.round((distanceKm / 18) * 60);
}
