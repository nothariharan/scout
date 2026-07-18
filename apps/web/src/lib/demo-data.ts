// Demo seed data for @scout/web.
//
// This is DEMO SEED DATA, not a contract and not live output. It mirrors the
// fixtures in packages/evals and lets every screen render before live
// ElevenLabs / Places / telephony keys are wired in. All money numbers are
// consistent with @scout/contracts effectiveMonthlyCost():
//   effective = base_rent + deposit/months + maintenance_monthly
//             + brokerage_onetime/months + hidden_charges
//
// Transcript line `index` values are load-bearing: DEMO_RECOMMENDATION's
// evidence_refs point at specific indices here, so the report's "evidence"
// links resolve to real lines. Keep them in sync.

import type {
  CallRecord,
  CandidateListing,
  ConfirmedRequirement,
  Quote,
  Recommendation,
} from "./types";

export const DEMO_REQUIREMENT: ConfirmedRequirement = {
  id: "req_demo_koramangala_pg",
  source_path: "both",
  confirmed_at: "2026-07-19T08:30:00.000Z",
  spec: {
    deal_type: "pg",
    location: {
      area: "Koramangala",
      city: "Bengaluru",
      pincode: "560034",
      lat: 12.9352,
      lng: 77.6245,
    },
    commute_constraint: {
      reference_point_lat: 12.9698,
      reference_point_lng: 77.6499,
      max_minutes: 40,
    },
    budget: { ideal: 13000, ceiling: 16000, currency: "INR" },
    negotiation_posture: "balanced",
    occupancy: 1,
    furnishing: "semi",
    amenities: ["wifi", "food_included", "security"],
    move_in_date: "2026-08-01",
    lease_duration_months: 12,
    deal_breakers: ["no triple sharing", "must allow late entry"],
    doc_readiness: { id_proof: true, income_proof: true, company_letter: false },
    language_pref: "en",
  },
};

export const DEMO_CANDIDATES: CandidateListing[] = [
  {
    listing_id: "pg_kor_001",
    listing_name: "Zolo Nest PG, 5th Block Koramangala",
    source: "google_places",
    deal_type: "pg",
    phone: "+91-90000-00001",
    area: "Koramangala",
    lat: 12.9345,
    lng: 77.6265,
    distance_km: 0.4,
    commute_minutes: 32,
    advertised_rent: 12000,
    listing_url: "https://scout.demo/listings/pg_kor_001",
  },
  {
    listing_id: "pg_kor_002",
    listing_name: "Comfort Stay PG, 6th Block Koramangala",
    source: "nobroker",
    deal_type: "pg",
    phone: "+91-90000-00002",
    area: "Koramangala",
    lat: 12.9372,
    lng: 77.6218,
    distance_km: 0.7,
    commute_minutes: 28,
    advertised_rent: 11000,
    listing_url: "https://scout.demo/listings/pg_kor_002",
  },
  {
    listing_id: "pg_kor_003",
    listing_name: "Sunrise Luxury PG (unverified)",
    source: "magicbricks",
    deal_type: "pg",
    phone: "+91-90000-00003",
    area: "Koramangala",
    lat: 12.9331,
    lng: 77.629,
    distance_km: 0.9,
    commute_minutes: 30,
    advertised_rent: 6000,
    listing_url: "https://scout.demo/listings/pg_kor_003",
  },
];

// --- Quotes (post-call, normalised) -----------------------------------------

const QUOTE_001: Quote = {
  listing_id: "pg_kor_001",
  listing_name: "Zolo Nest PG, 5th Block Koramangala",
  seller_language: "en",
  base_rent: 12000,
  deposit: 24000,
  maintenance_monthly: 1000,
  brokerage_onetime: 6000,
  hidden_charges: 0,
  lease_duration_months: 12,
  amenities_included: ["wifi", "food_included", "security"],
  effective_monthly_cost: 15500,
  first_quoted_effective: 15500,
  final_quoted_effective: 15500,
  price_moved: false,
  risk_flag: "verified",
  fraud_signals: [],
  commute_minutes: 32,
  call_outcome: { status: "itemized_quote" },
  transcript_url: "https://scout.demo/transcripts/pg_kor_001.txt",
  recording_url: "https://scout.demo/recordings/pg_kor_001.mp3",
};

const QUOTE_002: Quote = {
  listing_id: "pg_kor_002",
  listing_name: "Comfort Stay PG, 6th Block Koramangala",
  seller_language: "hi",
  base_rent: 10000,
  deposit: 20000,
  maintenance_monthly: 1500,
  brokerage_onetime: 4000,
  hidden_charges: 0,
  lease_duration_months: 12,
  amenities_included: ["wifi", "food_included", "parking", "security"],
  effective_monthly_cost: 13500,
  first_quoted_effective: 14500,
  final_quoted_effective: 13500,
  price_moved: true,
  risk_flag: "verified",
  fraud_signals: [],
  commute_minutes: 28,
  call_outcome: { status: "itemized_quote" },
  transcript_url: "https://scout.demo/transcripts/pg_kor_002.txt",
  recording_url: "https://scout.demo/recordings/pg_kor_002.mp3",
};

const QUOTE_003: Quote = {
  listing_id: "pg_kor_003",
  listing_name: "Sunrise Luxury PG (unverified)",
  seller_language: "en",
  base_rent: 6000,
  deposit: 30000,
  maintenance_monthly: 0,
  brokerage_onetime: 0,
  hidden_charges: 0,
  lease_duration_months: 12,
  amenities_included: ["wifi", "food_included", "gym", "ac", "parking", "security"],
  effective_monthly_cost: 8500,
  first_quoted_effective: 8500,
  final_quoted_effective: 8500,
  price_moved: false,
  risk_flag: "high_risk",
  fraud_signals: ["pre_visit_deposit"],
  commute_minutes: 30,
  call_outcome: {
    status: "declined",
    reason:
      "Seller demanded the full 30,000 deposit over GPay before allowing any visit; matched the pre_visit_deposit fraud rule.",
  },
  transcript_url: "https://scout.demo/transcripts/pg_kor_003.txt",
  recording_url: "https://scout.demo/recordings/pg_kor_003.mp3",
};

export const DEMO_QUOTES: Quote[] = [QUOTE_002, QUOTE_001, QUOTE_003];

// --- Calls (with transcripts; indices referenced by DEMO_RECOMMENDATION) -----

export const DEMO_CALLS: CallRecord[] = [
  {
    listing_id: "pg_kor_001",
    listing_name: "Zolo Nest PG, 5th Block Koramangala",
    persona: "Tough negotiator (holds firm)",
    phase: "completed",
    outcome: QUOTE_001.call_outcome,
    quote: QUOTE_001,
    recording_url: QUOTE_001.recording_url,
    transcript: [
      { index: 0, speaker: "scout", tag: "disclosure", text: "Hi, this is Scout, an AI assistant calling on behalf of a client looking for a PG in Koramangala. Happy to say up front I'm an automated assistant — is now an okay time?" },
      { index: 1, speaker: "seller", text: "Yes, this is the manager. Go ahead." },
      { index: 2, speaker: "scout", text: "My client wants a single-occupancy room, move-in around the 1st of August, food included. Do you have availability?" },
      { index: 3, speaker: "seller", text: "Yes, one single room is free from August." },
      { index: 4, speaker: "scout", text: "Could you give me the full monthly cost — rent, deposit, maintenance, and any brokerage?" },
      { index: 5, speaker: "seller", text: "Rent 12,000, deposit 24,000, maintenance 1,000 a month, and a one-time brokerage of 6,000." },
      { index: 6, speaker: "scout", text: "So amortised that's an effective 15,500 a month. Have I got that right?" },
      { index: 7, speaker: "seller", text: "Correct." },
      { index: 8, speaker: "scout", tag: "leverage", text: "I have a comparable verified single PG nearby at an effective 13,500. Is there any flexibility on the rent or brokerage?" },
      { index: 9, speaker: "seller", text: "No. Our rooms are premium and the price is fixed — we have a waitlist." },
      { index: 10, speaker: "scout", text: "Understood, no pressure at all." },
      { index: 11, speaker: "scout", tag: "guardrail", text: "Just to be clear, I can't commit or pay anything today — anything here is subject to my client's confirmation. Could we hold a viewing slot?" },
      { index: 12, speaker: "seller", text: "Walk-ins are fine this week." },
      { index: 13, speaker: "scout", text: "Thank you. I'll log this quote for my client." },
    ],
  },
  {
    listing_id: "pg_kor_002",
    listing_name: "Comfort Stay PG, 6th Block Koramangala",
    persona: "Fee-padder (caves to a verified comparable)",
    phase: "completed",
    outcome: QUOTE_002.call_outcome,
    quote: QUOTE_002,
    recording_url: QUOTE_002.recording_url,
    transcript: [
      { index: 0, speaker: "scout", tag: "disclosure", text: "Hello, this is Scout — an AI assistant calling for a client looking for a PG in Koramangala. I'm automated; is this a good time to talk numbers?" },
      { index: 1, speaker: "seller", text: "AI, huh. Okay, yes, go ahead." },
      { index: 2, speaker: "scout", text: "Single room, food included, move-in around August 1st. Anything available?" },
      { index: 3, speaker: "seller", text: "Yes, a single is open from August." },
      { index: 4, speaker: "scout", text: "Can you break down the full cost for me — rent, deposit, maintenance, brokerage?" },
      { index: 5, speaker: "seller", text: "Rent is 11,000 a month." },
      { index: 6, speaker: "scout", text: "And the deposit?" },
      { index: 7, speaker: "seller", text: "20,000 — two months." },
      { index: 8, speaker: "scout", text: "Maintenance or society charges on top?" },
      { index: 9, speaker: "seller", text: "1,500 a month — that covers food, wifi, cleaning." },
      { index: 10, speaker: "scout", text: "Any brokerage or one-time fee?" },
      { index: 11, speaker: "seller", text: "4,000 one-time brokerage." },
      { index: 12, speaker: "scout", text: "Let me total that so I quote my client the real number, not just the headline rent." },
      { index: 13, speaker: "scout", text: "First pass: 11,000 rent, 20,000 deposit, 1,500 maintenance, 4,000 brokerage — that's an effective 14,500 a month." },
      { index: 14, speaker: "seller", text: "Yes, that's right." },
      { index: 15, speaker: "scout", tag: "leverage", text: "I appreciate the transparency. I do have a comparable single PG nearby — verified on a call today — coming in at an effective 13,500, food included." },
      { index: 16, speaker: "seller", text: "Which place is that?" },
      { index: 17, speaker: "scout", text: "I can't share the owner's details, but it's a real quote I captured today, same area. Is there flexibility to get closer to it?" },
      { index: 18, speaker: "seller", text: "The brokerage is fixed..." },
      { index: 19, speaker: "scout", text: "Understood. What about the base rent?" },
      { index: 20, speaker: "seller", text: "I could do 10,500." },
      { index: 21, speaker: "scout", text: "That's about 14,000 effective. The comparable is 13,500 — can you meet it on rent?" },
      { index: 22, speaker: "seller", text: "Let me check... " },
      { index: 23, speaker: "seller", text: "Okay — 10,000 rent, but that's my final." },
      { index: 24, speaker: "scout", tag: "concession", text: "That brings the effective to 13,500 — matching the comparable. Thank you, I'll record that." },
      { index: 25, speaker: "scout", tag: "guardrail", text: "To be clear, I can't commit or pay today — this is subject to my client's confirmation. Can we hold a viewing?" },
      { index: 26, speaker: "seller", text: "Sure, come see it this week." },
      { index: 27, speaker: "scout", text: "Logging the final quote now." },
    ],
  },
  {
    listing_id: "pg_kor_003",
    listing_name: "Sunrise Luxury PG (unverified)",
    persona: "Stonewaller (pre-visit deposit / pressure tactics)",
    phase: "completed",
    outcome: QUOTE_003.call_outcome,
    quote: QUOTE_003,
    recording_url: QUOTE_003.recording_url,
    transcript: [
      { index: 0, speaker: "scout", tag: "disclosure", text: "Hi, this is Scout, an AI assistant calling on behalf of a client. Do you have a single PG room in Koramangala for August?" },
      { index: 1, speaker: "seller", text: "Yeah, very cheap, 6,000 only, fully loaded — AC, gym, food." },
      { index: 2, speaker: "scout", text: "That's well below the going rate for the area. Can you confirm what's actually included and the deposit?" },
      { index: 3, speaker: "seller", text: "Everything included. Deposit 30,000." },
      { index: 4, speaker: "scout", text: "I'd like to arrange a visit for my client before anything else." },
      { index: 5, speaker: "seller", text: "No no — first pay a token to hold it. Everyone is asking, it will go today." },
      { index: 6, speaker: "scout", text: "So you'd need money before a visit?" },
      { index: 7, speaker: "seller", text: "Someone else is viewing this evening, you'll lose it." },
      { index: 8, speaker: "scout", text: "I understand there's interest. To be precise: what exactly would you need paid, and when?" },
      { index: 9, speaker: "seller", tag: "fraud", text: "GPay the full 30,000 deposit now to lock it, then you can visit." },
      { index: 10, speaker: "scout", tag: "guardrail", text: "I can't do that. Paying a deposit before a verified visit and a written agreement isn't something my client will do, and I have to flag this as a risk." },
      { index: 11, speaker: "seller", text: "Then no room for you." },
      { index: 12, speaker: "scout", text: "Understood. I'll record this as declined with the reason. Thank you for your time." },
    ],
  },
];

// --- Recommendation (evidence_refs point at real transcript indices above) ---

export const DEMO_RECOMMENDATION: Recommendation = {
  requirement_spec_id: "req_demo_koramangala_pg",
  ranked_listing_ids: ["pg_kor_002", "pg_kor_001", "pg_kor_003"],
  top_pick: {
    listing_id: "pg_kor_002",
    reasoning:
      "Comfort Stay is the best verified value at an effective ₹13,500/mo — inside the ₹16,000 ceiling and close to the ₹13,000 ideal. It's the only call where the price actually moved: the owner opened at an effective ₹14,500/mo and conceded to ₹13,500/mo after Scout cited a real comparable verified quote. Zolo Nest is verified but ₹2,000/mo dearer and held firm. Sunrise Luxury quotes the lowest headline rent but is flagged high risk — it demanded the full deposit over GPay before any visit — so it's ranked last despite the price.",
    evidence_refs: [
      { listing_id: "pg_kor_002", line_index: 13, quote_field: "first_quoted_effective" },
      { listing_id: "pg_kor_002", line_index: 15, quote_field: "price_moved" },
      { listing_id: "pg_kor_002", line_index: 24, quote_field: "final_quoted_effective" },
      { listing_id: "pg_kor_001", line_index: 9, quote_field: "negotiable" },
      { listing_id: "pg_kor_003", line_index: 9, quote_field: "fraud_signals" },
    ],
  },
  generated_at: "2026-07-19T09:00:00.000Z",
};

/** Convenience lookup used by the report + calls pages. */
export function callById(listingId: string): CallRecord | undefined {
  return DEMO_CALLS.find((c) => c.listing_id === listingId);
}

export function quoteById(listingId: string): Quote | undefined {
  return DEMO_QUOTES.find((q) => q.listing_id === listingId);
}
