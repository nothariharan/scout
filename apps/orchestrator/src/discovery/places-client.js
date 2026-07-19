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
    const candidates = (data.places ?? []).map((p) => ({
      listing_id: p.id,
      listing_name: p.displayName?.text ?? '',
      phone: p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? null,
      address: p.formattedAddress ?? '',
      lat: p.location?.latitude ?? null,
      lng: p.location?.longitude ?? null,
      distance_km:
        p.location != null ? round1(haversineKm(lat, lng, p.location.latitude, p.location.longitude)) : null,
      source: 'google_places',
      deal_type: dealType,
    }));
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
