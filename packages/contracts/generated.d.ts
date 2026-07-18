/**
 * @scout/contracts — generated TypeScript types.
 *
 * SOURCE OF TRUTH = the JSON Schemas in ./src/schemas/*.json (frozen contracts).
 * These types MIRROR those schemas 1:1 (snake_case, same enums). Regenerate with
 * `pnpm --filter @scout/contracts generate:types` after any schema edit — do not
 * hand-edit field names here without changing the schema first (see CONTRIBUTING.md).
 *
 * TypeScript apps import from '@scout/contracts/types'; runtime code imports the
 * scoring functions from '@scout/contracts' and the raw schemas by path.
 */

/** Shared amenity vocabulary (requirement_spec.amenities + quote.amenities_included). */
export type Amenity =
  | "wifi"
  | "food_included"
  | "parking"
  | "gym"
  | "security"
  | "ac";

export type DealType = "pg" | "short_stay_rental";
export type Furnishing = "unfurnished" | "semi" | "furnished";
export type NegotiationPosture = "aggressive" | "balanced" | "fast";
export type RiskFlag = "verified" | "caution" | "high_risk";

/** call_outcome.json — every call terminates as exactly one of these. */
export type CallStatus = "itemized_quote" | "callback_scheduled" | "declined";

export interface CallOutcome {
  status: CallStatus;
  /** Required for callback_scheduled (why/when) and declined (why). */
  reason?: string;
  /** Optional ISO 8601 timestamp for a scheduled callback. */
  callback_at?: string;
}

/** requirement_spec.json — the single confirmed housing requirement. */
export interface RequirementSpec {
  deal_type: DealType;
  location: {
    area: string;
    city: string;
    pincode?: string;
    lat?: number;
    lng?: number;
  };
  commute_constraint?: {
    reference_point_lat: number;
    reference_point_lng: number;
    max_minutes: number;
  };
  budget: {
    ideal: number;
    ceiling: number;
    /** ISO 4217, e.g. "INR". */
    currency: string;
  };
  negotiation_posture: NegotiationPosture;
  occupancy: number;
  furnishing: Furnishing;
  amenities?: Amenity[];
  /** ISO 8601 date. */
  move_in_date: string;
  lease_duration_months: number;
  deal_breakers?: string[];
  doc_readiness?: {
    id_proof: boolean;
    income_proof: boolean;
    company_letter: boolean;
  };
  /** ISO 639-1, default "en". */
  language_pref?: string;
}

/** quote.json — one normalised quote extracted from ONE call. */
export interface Quote {
  listing_id: string;
  listing_name?: string;
  seller_language?: string;

  base_rent: number;
  deposit: number;
  maintenance_monthly: number;
  brokerage_onetime: number;
  hidden_charges: number;

  lease_duration_months: number;
  amenities_included?: Amenity[];

  /** COMPUTED via effectiveMonthlyCost(). The single number quotes rank by. */
  effective_monthly_cost: number;
  first_quoted_effective?: number;
  final_quoted_effective?: number;
  price_moved?: boolean;

  /** COMPUTED via riskFlag(). */
  risk_flag: RiskFlag;
  fraud_signals?: string[];
  commute_minutes?: number;

  call_outcome: CallOutcome;

  transcript_url?: string;
  recording_url?: string;
}

/** candidate_listing.json — a discovered listing before any call is placed. */
export interface CandidateListing {
  listing_id: string;
  listing_name: string;
  source: string;
  deal_type: DealType;
  phone?: string;
  area?: string;
  lat?: number;
  lng?: number;
  distance_km?: number;
  commute_minutes?: number;
  advertised_rent?: number;
  listing_url?: string;
}

/** recommendation.json — final ranked shortlist for one RequirementSpec. */
export interface EvidenceRef {
  listing_id: string;
  line_index: number;
  quote_field?: string;
}

export interface Recommendation {
  requirement_spec_id: string;
  ranked_listing_ids: string[];
  top_pick: {
    listing_id: string;
    reasoning: string;
    evidence_refs: EvidenceRef[];
  };
  generated_at?: string;
}
