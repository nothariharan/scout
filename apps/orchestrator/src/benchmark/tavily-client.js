// tavily-client.js
// Pull real area rent data via Tavily. Reads TAVILY_API_KEY from env. When no
// key is present it returns { available: false } so the benchmark service can
// fall back gracefully instead of throwing.
// TODO(person-b): tune the query + parse listing prices out of the results.

const TAVILY_ENDPOINT = 'https://api.tavily.com/search';

/**
 * @param {{area?:string, city?:string, pincode?:string, dealType?:string}} loc
 * @returns {Promise<{available:boolean, results:any[], error?:string}>}
 */
export async function fetchAreaRentData({ area, city, pincode, dealType } = {}) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return { available: false, results: [] };
  }

  const query = `average ${dealType ?? 'rental'} rent ${area ?? ''} ${city ?? ''} ${pincode ?? ''} per month`;
  try {
    const res = await fetch(TAVILY_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: 8,
        search_depth: 'advanced',
      }),
    });
    if (!res.ok) {
      return { available: false, results: [], error: `tavily ${res.status}` };
    }
    const data = await res.json();
    return { available: true, results: data.results ?? [] };
  } catch (err) {
    return { available: false, results: [], error: String(err) };
  }
}
