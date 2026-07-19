"use client";

import { useEffect, useState } from "react";
import {
  DEMO_CANDIDATES,
  DEMO_QUOTES,
  DEMO_RECOMMENDATION,
  DEMO_REQUIREMENT,
  callById,
} from "@/lib/demo-data";
import { QuoteTable } from "@/components/QuoteTable";
import { RiskBadge } from "@/components/RiskBadge";
import { MapPanel } from "@/components/MapPanel";
import { fraudLabel, inr } from "@/lib/format";
import type { EvidenceRef, Quote } from "@/lib/types";

type OrchestratorReport = {
  ranked: Quote[];
  recommendation: { headline?: string; narrative?: string };
};

export default function ReportPage({ params }: { params: { requirementSpecId: string } }) {
  const [liveReport, setLiveReport] = useState<OrchestratorReport | null>(null);
  const spec = DEMO_REQUIREMENT.spec;

  useEffect(() => {
    let active = true;
    fetch("/api/orchestrator/report", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: OrchestratorReport | null) => {
        if (active && data?.ranked?.length) setLiveReport(data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const demoRanked = DEMO_RECOMMENDATION.ranked_listing_ids
    .map((id) => DEMO_QUOTES.find((q) => q.listing_id === id))
    .filter((q): q is NonNullable<typeof q> => Boolean(q));
  const ranked = liveReport?.ranked ?? demoRanked;
  const topPickId = ranked[0]?.listing_id ?? DEMO_RECOMMENDATION.top_pick.listing_id;

  const topQuote = ranked.find((q) => q.listing_id === topPickId);
  const priceMoved = ranked.filter((q) => q.price_moved).length;
  const highRisk = ranked.filter((q) => q.risk_flag === "high_risk").length;

  const candidatesForMap = ranked.map((q) => {
    const disc = DEMO_CANDIDATES.find((c) => c.listing_id === q.listing_id);
    return {
      listing_id: q.listing_id,
      listing_name: q.listing_name ?? q.listing_id,
      source: disc?.source ?? "call",
      deal_type: spec.deal_type,
      lat: disc?.lat,
      lng: disc?.lng,
      commute_minutes: q.commute_minutes,
    };
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl">Ranked shortlist</h1>
          <p className="mono mt-1 text-[11px] uppercase tracking-wide text-charcoal/55">
            {spec.deal_type} · {spec.location.area}, {spec.location.city} · ≤ {inr(spec.budget.ceiling)}/mo
          </p>
          <p className="mono mt-0.5 text-[11px] text-charcoal/40">{params.requirementSpecId}</p>
        </div>
          <div className="rec-stamp">{liveReport ? "Live Report" : "Demo Report"}</div>
      </header>

      {/* Case-file metadata line. */}
      <div className="card grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
        <Stat label="Calls" value={String(ranked.length)} />
        <Stat label="Quotes" value={String(ranked.length)} />
        <Stat label="Prices moved" value={String(priceMoved)} tone="sage" />
        <Stat label="High risk" value={String(highRisk)} tone={highRisk > 0 ? "rust" : undefined} />
      </div>

      <section className="space-y-3">
        <h2 className="mono text-xs uppercase tracking-widest text-charcoal/55">
          Comparison · by effective monthly cost
        </h2>
        <QuoteTable quotes={ranked} topPickId={topPickId} ceiling={spec.budget.ceiling} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <section className="space-y-3">
          <h2 className="mono text-xs uppercase tracking-widest text-charcoal/55">Recommendation</h2>
          <div className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg">{topQuote?.listing_name}</h3>
              <RiskBadge flag={topQuote?.risk_flag ?? "verified"} />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-charcoal/85">
              {liveReport?.recommendation.narrative ?? liveReport?.recommendation.headline ?? DEMO_RECOMMENDATION.top_pick.reasoning}
            </p>

            <div className="wire my-4" />
            <div className="mono mb-2 text-[11px] uppercase tracking-wide text-charcoal/55">
              {liveReport ? "Evidence · linked to each call outcome" : "Evidence · each claim → a transcript line"}
            </div>
            {liveReport ? (
              <p className="text-sm text-charcoal/70">
                Call outcomes and recording/transcript URLs are returned by the orchestrator. The demo transcript ledger remains visible in Live activity.
              </p>
            ) : (
              <ul className="space-y-2">
                {DEMO_RECOMMENDATION.top_pick.evidence_refs.map((e, i) => (
                  <EvidenceItem key={i} refItem={e} />
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="mono text-xs uppercase tracking-widest text-charcoal/55">Risk &amp; location</h2>
          <div className="h-[230px]">
            <MapPanel spec={spec} candidates={candidatesForMap} selectedIds={new Set(ranked.map((q) => q.listing_id))} />
          </div>
          <ul className="space-y-2">
            {ranked
              .filter((q) => (q.fraud_signals?.length ?? 0) > 0)
              .map((q) => (
                <li key={q.listing_id} className="card p-3" style={{ background: "#f9ece5" }}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium" style={{ color: "var(--rust)" }}>{q.listing_name}</span>
                    <RiskBadge flag={q.risk_flag} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {q.fraud_signals!.map((s) => (
                      <span key={s} className="pill pill-rust">{fraudLabel(s)}</span>
                    ))}
                  </div>
                  {q.call_outcome.reason && (
                    <p className="mt-1.5 text-[12px] text-charcoal/65">{q.call_outcome.reason}</p>
                  )}
                </li>
              ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function EvidenceItem({ refItem }: { refItem: EvidenceRef }) {
  const call = callById(refItem.listing_id);
  const line = call?.transcript.find((l) => l.index === refItem.line_index);
  return (
    <li className="rounded-md p-3" style={{ background: "var(--paper-2)" }}>
      <div className="mono flex items-center gap-2 text-[10px] uppercase tracking-wide text-charcoal/55">
        <span className="text-ink">{call?.listing_name ?? refItem.listing_id}</span>
        <span>line #{refItem.line_index}</span>
        {refItem.quote_field && <span className="pill">{refItem.quote_field}</span>}
      </div>
      {line ? (
        <p className="mt-1.5 text-sm text-charcoal/85">
          <span
            className="mono mr-1.5 text-[10px] font-semibold uppercase"
            style={{ color: line.speaker === "scout" ? "var(--rust)" : "var(--ink)" }}
          >
            {line.speaker}:
          </span>
          {line.text}
        </p>
      ) : (
        <p className="mt-1.5 text-sm text-charcoal/45">[line unavailable]</p>
      )}
    </li>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "sage" | "rust";
}) {
  const color = tone === "sage" ? "var(--sage)" : tone === "rust" ? "var(--rust)" : "var(--ink)";
  return (
    <div className="p-4">
      <div className="mono text-[10px] uppercase tracking-wide text-charcoal/55">{label}</div>
      <div className="serif mt-1 text-3xl" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
