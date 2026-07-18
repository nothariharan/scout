import type { RiskFlag, CallStatus } from "@scout/contracts/types";

/** Indian-rupee formatting with grouping, no decimals for whole amounts. */
export function inr(amount: number | undefined | null): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function pct(n: number): string {
  return `${n > 0 ? "+" : ""}${Math.round(n)}%`;
}

export const RISK_LABEL: Record<RiskFlag, string> = {
  verified: "Verified",
  caution: "Caution",
  high_risk: "High risk",
};

export const OUTCOME_LABEL: Record<CallStatus, string> = {
  itemized_quote: "Itemised quote",
  callback_scheduled: "Callback scheduled",
  declined: "Declined",
};

/** Human label + short blurb for a fraud-signal id (mirrors vertical-config rule ids). */
export const FRAUD_LABEL: Record<string, string> = {
  pre_visit_deposit: "Pre-visit deposit demanded",
  no_agreement: "Refuses written agreement",
  refuses_visit: "Refuses a physical visit",
  duplicate_listing: "Listing duplicated across portals",
  price_too_good: "Price far below market",
};

export function fraudLabel(id: string): string {
  return FRAUD_LABEL[id] ?? id.replace(/_/g, " ");
}
