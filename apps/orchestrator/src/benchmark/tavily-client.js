// tavily-client.js
// Pull real area rent data via Tavily to build the price benchmark (the red-flag
// baseline + the negotiation anchor). Reads TAVILY_API_KEY from env; returns
// { available:false } with no key so the benchmark service falls back gracefully.
//
// Grounded in the Tavily API (https://docs.tavily.com). We request a synthesized
// answer (include_answer:'advanced') plus advanced results so the benchmark
// service can parse a monthly figure out of real text.

const TAVILY_ENDPOINT = 'https://api.tavily.com/search';

/**
 * @param {{area?:string, city?:string, pincode?:string, dealType?:string, country?:string}} loc
 * @returns {Promise<{available:boolean, answer:string, results:any[], error?:string}>}
 */
export async function fetchAreaRentData({ area, city, pincode, dealType, country = 'india' } = {}) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return { available: false, answer: '', results: [] };
  }

  const query = `average monthly ${dealType ?? 'rental'} rent for ${area ?? ''} ${city ?? ''} ${pincode ?? ''}`.trim();
  try {
    const res = await fetch(TAVILY_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        search_depth: 'advanced',
        topic: 'general',
        max_results: 8,
        include_answer: 'advanced',
        country,
      }),
    });
    if (!res.ok) {
      return { available: false, answer: '', results: [], error: `tavily ${res.status}` };
    }
    const data = await res.json();
    return { available: true, answer: data.answer ?? '', results: data.results ?? [] };
  } catch (err) {
    return { available: false, answer: '', results: [], error: String(err) };
  }
}
