"use client";

import { useEffect, useState } from "react";

type ResultItem = {
  listing_id: string;
  listing_name?: string;
  vendor_id?: string;
  vendor_name?: string;
  agreed_value?: number;
  effective_monthly_cost?: number;
  binding_total?: number;
  final_quoted_effective?: number;
  first_quoted_effective?: number;
  first_quoted_total?: number;
  risk_flag?: string;
  fraud_signals?: string[];
  risk_signals?: string[];
  call_outcome?: { status?: string } | string;
  transcript_url?: string;
  recording_url?: string;
};

type Results = {
  ranked: ResultItem[];
  recommendation?: { headline?: string };
  benchmark?: { effective_monthly?: number; value?: number; source?: string; sample_size?: number };
  currency?: string;
};

function formatValue(value: number | undefined, currency = "INR") {
  if (value == null) return "See confirmed terms";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function outcomeStatus(item: ResultItem) {
  const value = typeof item.call_outcome === "string" ? item.call_outcome : item.call_outcome?.status;
  return value?.replace(/_/g, " ") ?? "Terms pending";
}

export default function ResultsPage() {
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id =
      localStorage.getItem("scout_requirement_id") ??
      localStorage.getItem("scout_real_estate_requirement_id") ??
      localStorage.getItem("scout_moving_requirement_id");
    if (!id) {
      setError("Confirm an outcome and complete at least one authorized conversation to see results.");
      return;
    }
    void fetch(`/api/orchestrator/requirements/${id}/report`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Could not load results.");
        setResults(body);
      })
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Could not load results."),
      );
  }, []);

  return (
    <div className="state-page">
      <header className="state-page-head">
        <div>
          <p>EVIDENCE-BACKED RESULTS</p>
          <h1>What every target said and agreed to.</h1>
          <span>
            Compare acceptances, declines, conditions, quoted terms, and next steps with the source
            transcript attached.
          </span>
        </div>
      </header>

      {error ? <p className="state-error">{error}</p> : null}

      {results ? (
        <>
          <section className="result-recommendation">
            <p>SCOUT SUMMARY</p>
            <h2>{results.recommendation?.headline ?? "No agreed terms have been recorded yet."}</h2>
            {results.benchmark?.effective_monthly != null || results.benchmark?.value != null ? (
              <span>
                Verified reference: {formatValue(results.benchmark.value ?? results.benchmark.effective_monthly, results.currency)}
                {results.benchmark.source ? ` · ${results.benchmark.source}` : ""}
                {results.benchmark.sample_size != null ? ` · ${results.benchmark.sample_size} sources` : ""}
              </span>
            ) : null}
          </section>

          <ol className="state-result-list">
            {!results.ranked.length ? (
              <li className="empty-targets">No structured outcome has been recorded. Complete an authorized conversation first.</li>
            ) : null}
            {results.ranked.map((item, index) => {
              const finalValue = item.agreed_value ?? item.binding_total ?? item.effective_monthly_cost ?? item.final_quoted_effective;
              const firstValue = item.first_quoted_total ?? item.first_quoted_effective;
              const signals = item.fraud_signals ?? item.risk_signals;
              return (
                <li key={item.listing_id ?? item.vendor_id ?? index}>
                  <span className="target-index">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{item.listing_name ?? item.vendor_name ?? item.listing_id ?? item.vendor_id ?? `Target ${index + 1}`}</strong>
                    <small>{outcomeStatus(item)} · {item.risk_flag ?? "Unassessed"}</small>
                    {signals?.length ? <p>{signals.join(" · ")}</p> : null}
                    <div className="evidence-links">
                      {item.transcript_url ? <a href={item.transcript_url} target="_blank" rel="noreferrer">Transcript</a> : null}
                      {item.recording_url ? <a href={item.recording_url} target="_blank" rel="noreferrer">Recording</a> : null}
                    </div>
                  </div>
                  <div className="result-terms">
                    <span>CONFIRMED TERMS</span>
                    <strong>{formatValue(finalValue, results.currency)}</strong>
                    {firstValue != null && finalValue != null && firstValue !== finalValue ? (
                      <small>{formatValue(firstValue, results.currency)} → {formatValue(finalValue, results.currency)}</small>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      ) : null}
    </div>
  );
}
