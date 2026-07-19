// OpenStreetMap discovery adapter. A provider boundary makes it replaceable.
const NOMINATIM_URL = process.env.OSM_NOMINATIM_URL ?? 'https://nominatim.openstreetmap.org/search';
const OVERPASS_URL = process.env.OSM_OVERPASS_URL ?? 'https://overpass-api.de/api/interpreter';
const USER_AGENT = process.env.OSM_USER_AGENT ?? 'ScoutBuyingAgent/0.1 (+https://github.com/nothariharan/scout)';
const geocodeCache = new Map();
let lastGeocodeAt = 0;

const SEARCH_TERMS = {
  moving: 'mover|moving|packers|relocation|logistics',
  pg: 'pg|paying guest|hostel|coliving|co-living',
  hostel: 'hostel|pg|paying guest|coliving|co-living',
  rental_apartment: 'apartment|flat|residential|real estate|property',
  property_agent: 'real estate|property agent|broker|estate agent',
  contractor: 'contractor|painter|waterproofing|tiling|interior|carpenter|renovation',
  home_services: 'plumber|electrician|cleaning|pest control',
};

/** Discover named OSM businesses around a confirmed location. */
export async function discoverCandidates({ location, radiusMeters = 5000, serviceType = 'property_agent', limit = 12, fetchImpl = fetch } = {}) {
  if (!location?.area && (location?.lat == null || location?.lng == null)) throw new Error('discovery requires a location area or coordinates');
  const center = await resolveCenter(location, fetchImpl);
  const term = SEARCH_TERMS[serviceType] ?? SEARCH_TERMS.property_agent;
  const radius = Math.min(Math.max(Number(radiusMeters) || 5000, 250), 15000);
  const query = `[out:json][timeout:20];(nwr(around:${radius},${center.lat},${center.lng})["name"~"${term}",i];);out center tags;`;
  const response = await fetchImpl(OVERPASS_URL, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': USER_AGENT }, body: new URLSearchParams({ data: query }).toString() });
  if (!response.ok) throw new Error(`OSM discovery unavailable (HTTP ${response.status})`);
  const payload = await response.json();
  const candidates = (payload.elements ?? []).map((item) => normalizeElement(item, center, serviceType)).filter(Boolean).sort((a, b) => a.distance_km - b.distance_km).slice(0, Math.min(Math.max(Number(limit) || 12, 1), 25));
  return { available: true, provider: 'openstreetmap', attribution: '© OpenStreetMap contributors', center, candidates };
}

async function resolveCenter(location, fetchImpl) {
  if (Number.isFinite(location?.lat) && Number.isFinite(location?.lng)) return { lat: Number(location.lat), lng: Number(location.lng), label: location.area ?? 'selected area' };
  const query = [location.area, location.city, location.pincode].filter(Boolean).join(', ');
  if (geocodeCache.has(query)) return geocodeCache.get(query);
  const waitMs = Math.max(0, 1000 - (Date.now() - lastGeocodeAt));
  if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
  lastGeocodeAt = Date.now();
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set('q', query); url.searchParams.set('format', 'jsonv2'); url.searchParams.set('limit', '1');
  const response = await fetchImpl(url, { headers: { accept: 'application/json', 'user-agent': USER_AGENT } });
  if (!response.ok) throw new Error(`OSM geocoding unavailable (HTTP ${response.status})`);
  const [match] = await response.json();
  if (!match) throw new Error(`No OSM location found for ${query}`);
  const center = { lat: Number(match.lat), lng: Number(match.lon), label: match.display_name };
  geocodeCache.set(query, center); return center;
}

function normalizeElement(element, center, serviceType) {
  const tags = element.tags ?? {}; const lat = Number(element.lat ?? element.center?.lat); const lng = Number(element.lon ?? element.center?.lon);
  if (!tags.name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const distance_km = Number(haversineKm(center.lat, center.lng, lat, lng).toFixed(2));
  const phone = tags['contact:phone'] ?? tags.phone ?? '';
  return { listing_id: `osm_${element.type}_${element.id}`, listing_name: tags.name, source: 'openstreetmap', service_type: serviceType, phone, callable: Boolean(phone), area: tags['addr:suburb'] ?? tags['addr:city'] ?? center.label, lat, lng, distance_km, commute_minutes: Math.max(1, Math.round((distance_km / 25) * 60)), listing_url: `https://www.openstreetmap.org/${element.type}/${element.id}` };
}
function haversineKm(lat1, lng1, lat2, lng2) { const r = (v) => (v * Math.PI) / 180; const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2; return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); }
