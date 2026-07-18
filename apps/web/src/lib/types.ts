// App-layer types for @scout/web.
// The contract types below are the FROZEN source of truth (@scout/contracts,
// generated from the JSON Schemas). We re-export them and add UI-only wrappers.
// We never mutate a RequirementSpec's shape — confirmation state lives in a
// wrapper so the spec itself is reused verbatim across every call.

import type {
  RequirementSpec,
  Quote,
  CandidateListing,
  Recommendation,
  EvidenceRef,
  CallOutcome,
  CallStatus,
  RiskFlag,
} from "@scout/contracts/types";

export type {
  RequirementSpec,
  Quote,
  CandidateListing,
  Recommendation,
  EvidenceRef,
  CallOutcome,
  CallStatus,
  RiskFlag,
};

/** Where the confirmed spec came from (voice intake, document parse, or both). */
export type SourcePath = "voice" | "document" | "both";

/** A RequirementSpec plus the app metadata the frozen schema deliberately omits. */
export interface ConfirmedRequirement {
  id: string;
  spec: RequirementSpec;
  source_path: SourcePath;
  /** ISO 8601. null until the user confirms; nothing dispatches before this is set. */
  confirmed_at: string | null;
}

/** Live call lifecycle (orchestrator's Call state machine, surfaced to the UI). */
export type CallPhase = "queued" | "dialing" | "live" | "completed" | "failed";

export interface TranscriptLine {
  /** Zero-based; recommendation.evidence_refs.line_index points here. */
  index: number;
  speaker: "scout" | "seller";
  text: string;
  /** Optional annotation surfaced in the UI, e.g. "disclosure", "leverage", "fraud". */
  tag?: "disclosure" | "leverage" | "fraud" | "concession" | "guardrail";
}

/** One call as the live ledger renders it. */
export interface CallRecord {
  listing_id: string;
  listing_name: string;
  persona: string;
  phase: CallPhase;
  transcript: TranscriptLine[];
  outcome?: CallOutcome;
  quote?: Quote;
  recording_url?: string;
}

/** Server-Sent Events pushed to the live activity ledger. */
export type CallStreamEvent =
  | { type: "snapshot"; calls: CallRecord[] }
  | { type: "phase"; listing_id: string; phase: CallPhase }
  | { type: "line"; listing_id: string; line: TranscriptLine }
  | { type: "outcome"; listing_id: string; outcome: CallOutcome; quote?: Quote }
  | { type: "done" };
