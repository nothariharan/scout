/**
 * @scout/contracts — generated TypeScript types.
 * SOURCE OF TRUTH = ./src/schemas/*.json. Regenerate with `pnpm --filter @scout/contracts generate:types`.
 */

/**
 * FROZEN CONTRACT. Every call MUST terminate as exactly one of these terminal states. Referenced by quote.json. TEAM DECISION PENDING: packages/contracts/README.md lists a 4th status 'error'; this Phase 0 draft ships the 3 product endings (itemized_quote | callback_scheduled | declined). Resolve before final freeze. Do not add a status without telling the whole team.
 */
export type CallOutcome = {
  [k: string]: unknown;
} & {
  /**
   * The single terminal state of the call.
   */
  status: "itemized_quote" | "callback_scheduled" | "declined";
  /**
   * Required for 'callback_scheduled' (why/when) and 'declined' (why). Omitted/empty for 'itemized_quote'.
   */
  reason?: string;
  /**
   * Optional ISO 8601 timestamp for a scheduled callback.
   */
  callback_at?: string;
};

/**
 * FROZEN CONTRACT. A discovered listing BEFORE any call is placed. Produced by discovery (Places/portal search) and geofenced by radius/commute BEFORE dispatch. The web app lets the user deselect candidates; the orchestrator dials the selected ones and each produces one Quote keyed by the same listing_id. Do not rename fields without telling the whole team.
 */
export interface CandidateListing {
  /**
   * Stable unique id; the resulting Quote reuses this exact id.
   */
  listing_id: string;
  /**
   * Human-readable property/listing name.
   */
  listing_name: string;
  /**
   * Where it was discovered, e.g. 'google_places', 'nobroker', 'magicbricks', 'manual'.
   */
  source: string;
  /**
   * Same vocabulary as requirement_spec deal_type.
   */
  deal_type: "pg" | "short_stay_rental";
  /**
   * Contact number to dial. May be absent until enriched.
   */
  phone?: string;
  /**
   * Neighbourhood / locality.
   */
  area?: string;
  /**
   * Listing latitude (for the map + commute filter).
   */
  lat?: number;
  /**
   * Listing longitude.
   */
  lng?: number;
  /**
   * Straight-line/road distance from the requirement's target area.
   */
  distance_km?: number;
  /**
   * Estimated one-way commute to the requirement's reference point (Distance Matrix).
   */
  commute_minutes?: number;
  /**
   * Portal-advertised monthly rent, if any. Advisory only; the real number comes from the call's Quote.
   */
  advertised_rent?: number;
  /**
   * Link to the source listing, if any.
   */
  listing_url?: string;
}

/**
 * Comparable all-in moving quote captured from one vendor call.
 */
export interface MovingQuote {
  vendor_id: string;
  vendor_name: string;
  base_price: number;
  packing?: number;
  unpacking?: number;
  stairs?: number;
  long_carry?: number;
  fuel?: number;
  insurance?: number;
  storage?: number;
  other_fees?: number;
  binding_total: number;
  first_quoted_total?: number;
  price_moved?: boolean;
  quote_status: "binding" | "non_binding" | "estimate_only" | "declined";
  risk_flag: "verified" | "caution" | "high_risk";
  risk_signals?: string[];
  call_outcome?: "itemized_quote" | "callback_scheduled" | "declined" | "declined_for_risk";
  transcript?: string;
  transcript_url?: string;
  recording_url?: string;
}

/**
 * Confirmed, reusable request for Scout's moving-company pilot.
 */
export interface MovingRequest {
  vertical: "moving";
  origin: Address;
  destination: Address;
  move_date: string;
  home_size: "studio" | "1_bed" | "2_bed" | "3_bed_plus" | "custom";
  inventory_notes?: string;
  stairs?: {
    origin_floors?: number;
    destination_floors?: number;
    elevator_origin?: boolean;
    elevator_destination?: boolean;
  };
  services?: {
    packing?: boolean;
    unpacking?: boolean;
    insurance?: boolean;
    storage?: boolean;
  };
  budget: {
    ideal: number;
    ceiling: number;
    currency: string;
  };
  negotiation_posture: "aggressive" | "balanced" | "fast";
  language_pref?: string;
}
export interface Address {
  area: string;
  city: string;
  pincode?: string;
  lat?: number;
  lng?: number;
}

/**
 * FROZEN CONTRACT. One normalized quote extracted from ONE call. The Voice agent emits it, the orchestrator ranks it, the web app renders it. Money fields are in the vertical currency (see @scout/vertical-config). Do not rename fields without telling the whole team.
 */
export interface Quote {
  /**
   * Stable unique id for the listing.
   */
  listing_id: string;
  /**
   * Human-readable listing/property name.
   */
  listing_name?: string;
  /**
   * Language the seller spoke (ISO 639-1 or free text).
   */
  seller_language?: string;
  /**
   * Monthly rent, excluding all other charges.
   */
  base_rent: number;
  /**
   * One-time refundable security deposit.
   */
  deposit: number;
  /**
   * Recurring monthly maintenance charge.
   */
  maintenance_monthly: number;
  /**
   * One-time broker fee.
   */
  brokerage_onetime: number;
  /**
   * Any extra recurring monthly charge surfaced during the call (electricity padding, 'convenience' fees, etc.).
   */
  hidden_charges: number;
  /**
   * Lease length used to amortize one-time fees.
   */
  lease_duration_months: number;
  /**
   * Amenities the seller confirmed are included. Same vocabulary as requirement_spec amenities.
   */
  amenities_included?: ("wifi" | "food_included" | "parking" | "gym" | "security" | "ac")[];
  /**
   * COMPUTED. Output of effectiveMonthlyCost() in this package. The single number used to rank quotes.
   */
  effective_monthly_cost: number;
  /**
   * Effective monthly cost as first quoted (for price-drop capture).
   */
  first_quoted_effective?: number;
  /**
   * Effective monthly cost after negotiation (for price-drop capture).
   */
  final_quoted_effective?: number;
  /**
   * True if final_quoted_effective < first_quoted_effective (seller conceded).
   */
  price_moved?: boolean;
  /**
   * COMPUTED. Output of riskFlag() in this package.
   */
  risk_flag: "verified" | "caution" | "high_risk";
  /**
   * Fraud rule ids / phrases detected on the call (see @scout/vertical-config fraud_rules).
   */
  fraud_signals?: string[];
  /**
   * Estimated one-way commute from the listing to the requirement's reference point.
   */
  commute_minutes?: number;
  /**
   * How the call ended. See call_outcome.json.
   */
  call_outcome: {
    status: "itemized_quote" | "callback_scheduled" | "declined";
    reason?: string;
    callback_at?: string;
  };
  /**
   * Link to the full call transcript.
   */
  transcript_url?: string;
  /**
   * Link to the call audio recording.
   */
  recording_url?: string;
}

/**
 * FROZEN CONTRACT. The final ranked shortlist the orchestrator produces from a set of Quotes for one RequirementSpec. Every claim in top_pick.reasoning must be backed by an evidence_ref that points at a real transcript line. The web app renders this; it never computes ranking itself. Do not rename fields without telling the whole team.
 */
export interface Recommendation {
  /**
   * The confirmed RequirementSpec this recommendation answers. Must match the spec reused verbatim across every call.
   */
  requirement_spec_id: string;
  /**
   * All quoted listings, best first. Ordered by effective_monthly_cost with risk_flag as a tie-breaker/penalty (orchestrator owns the exact rule).
   *
   * @minItems 1
   */
  ranked_listing_ids: [string, ...string[]];
  top_pick: {
    /**
     * The single recommended listing. Must appear in ranked_listing_ids (normally first).
     */
    listing_id: string;
    /**
     * Plain-language explanation of why this is the top pick. Every factual claim must be traceable via evidence_refs.
     */
    reasoning: string;
    /**
     * Links from the reasoning to specific transcript lines. Never assert a negotiated number or concession without one.
     *
     * @minItems 1
     */
    evidence_refs: [
      {
        /**
         * Which call's transcript this evidence lives in.
         */
        listing_id: string;
        /**
         * Zero-based line index within that call's transcript.
         */
        line_index: number;
        /**
         * Optional: which Quote field this line substantiates, e.g. 'base_rent', 'price_moved', 'fraud_signals'.
         */
        quote_field?: string;
      },
      ...{
        /**
         * Which call's transcript this evidence lives in.
         */
        listing_id: string;
        /**
         * Zero-based line index within that call's transcript.
         */
        line_index: number;
        /**
         * Optional: which Quote field this line substantiates, e.g. 'base_rent', 'price_moved', 'fraud_signals'.
         */
        quote_field?: string;
      }[]
    ];
  };
  /**
   * Optional ISO 8601 timestamp when the recommendation was computed.
   */
  generated_at?: string;
}

/**
 * FROZEN CONTRACT. Single source of truth produced by the intake interview. The Voice/Intake agent fills this; every downstream consumer (orchestrator, web, evals) reads it. Do not rename fields without telling the whole team.
 */
export interface RequirementSpec {
  /**
   * Which rental product the user wants.
   */
  deal_type: "pg" | "short_stay_rental";
  /**
   * Where the user wants to live.
   */
  location: {
    /**
     * Neighbourhood / locality, e.g. 'Koramangala'.
     */
    area: string;
    /**
     * City, e.g. 'Bengaluru'.
     */
    city: string;
    /**
     * Postal PIN code.
     */
    pincode?: string;
    /**
     * Latitude of the target area.
     */
    lat?: number;
    /**
     * Longitude of the target area.
     */
    lng?: number;
  };
  /**
   * Optional. Anchor point (office/college) and the max acceptable commute.
   */
  commute_constraint?: {
    reference_point_lat: number;
    reference_point_lng: number;
    /**
     * Maximum one-way commute in minutes.
     */
    max_minutes: number;
  };
  /**
   * Monthly budget envelope the negotiator works within.
   */
  budget: {
    /**
     * Target effective monthly cost the user is happy with.
     */
    ideal: number;
    /**
     * Absolute walk-away effective monthly cost.
     */
    ceiling: number;
    /**
     * ISO 4217 code, e.g. 'INR'.
     */
    currency: string;
  };
  /**
   * How hard/fast the agent should negotiate.
   */
  negotiation_posture: "aggressive" | "balanced" | "fast";
  /**
   * Number of people who will occupy the unit.
   */
  occupancy: number;
  /**
   * Required furnishing level.
   */
  furnishing: "unfurnished" | "semi" | "furnished";
  /**
   * Desired amenities. Constrained to the known vocabulary.
   */
  amenities?: ("wifi" | "food_included" | "parking" | "gym" | "security" | "ac")[];
  /**
   * Desired move-in date (ISO 8601 date).
   */
  move_in_date: string;
  /**
   * Intended lease length in months. Used to amortize one-time fees into effective monthly cost.
   */
  lease_duration_months: number;
  /**
   * Free-text hard constraints, e.g. 'no ground floor', 'must allow cooking'.
   */
  deal_breakers?: string[];
  /**
   * Which documents the user already has ready (affects how fast a deal can close).
   */
  doc_readiness?: {
    id_proof: boolean;
    income_proof: boolean;
    company_letter: boolean;
  };
  /**
   * Preferred language for the call/UI (ISO 639-1).
   */
  language_pref?: string;
}

export type RiskFlag = 'verified' | 'caution' | 'high_risk';
export type CallStatus = CallOutcome['status'];
export type EvidenceRef = Recommendation['top_pick']['evidence_refs'][number];
