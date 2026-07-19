"use client";

import { useEffect, useState } from "react";

type MovingQuote = { vendor_id: string; vendor_name: string; binding_total?: number; first_quoted_total?: number; risk_flag?: string; risk_signals?: string[]; call_outcome?: string; total_fees?: number };
type Report = { ranked: MovingQuote[]; recommendation?: { headline?: string; top_pick?: string } };

const money = (value?: number) => value == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

export default function MovingReportPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("scout_moving_requirement_id") ?? localStorage.getItem("scout_requirement_id");
    if (!id) { setError("Confirm a moving brief and complete at least one call to see a report."); return; }
    void fetch(`/api/orchestrator/requirements/${id}/report`, { cache: "no-store" })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Could not load report."); setReport(body); })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load report."));
  }, []);

  return <div className="space-y-6">
    <header><p className="mono text-[11px] uppercase tracking-[0.18em] text-rust">Moving pilot · evidence-backed choice</p><h1 className="mt-2 text-3xl">Negotiation report.</h1><p className="mt-2 text-sm text-charcoal/70">Scout ranks confirmed all-in totals and moves high-risk quotes out of the top position. It never books or pays.</p></header>
    <div className="wire" />
    {error && <p className="mono text-[11px] text-rust">{error}</p>}
    {!report && !error && <p className="mono text-[11px] text-charcoal/55">Loading ranked moving quotes…</p>}
    {report && <><section className="card p-5"><p className="mono text-[10px] uppercase tracking-wide text-charcoal/50">Scout recommendation</p><p className="mt-2 text-lg">{report.recommendation?.headline ?? "No completed moving quotes yet."}</p><p className="mt-2 text-sm text-charcoal/65">Confirm terms directly with the selected company before any commitment.</p></section><ol className="card divide-y divide-line">{!report.ranked.length && <li className="p-6 text-sm text-charcoal/60">No itemized moving quote has been recorded yet. Use a simulated conversation or a consented test call first.</li>}{report.ranked.map((quote, index) => <li key={quote.vendor_id} className="grid gap-3 p-5 sm:grid-cols-[44px_1fr_auto]"><span className="call-idx">{String(index + 1).padStart(2, "0")}</span><div><p className="font-medium text-ink">{quote.vendor_name}</p><p className="mono mt-1 text-[11px] uppercase text-charcoal/55">{quote.call_outcome ?? "quote pending"} · {quote.risk_flag ?? "unassessed"}</p>{quote.risk_signals?.length ? <p className="mono mt-2 text-[11px] text-rust">{quote.risk_signals.join(" · ")}</p> : <p className="mono mt-2 text-[11px] text-charcoal/55">Itemized fees: {money(quote.total_fees)}</p>}</div><div className="sm:text-right"><p className="mono text-[10px] uppercase text-charcoal/50">Binding total</p><p className="mt-1 text-lg">{money(quote.binding_total)}</p>{quote.first_quoted_total != null && quote.first_quoted_total !== quote.binding_total && <p className="mono mt-1 text-[11px] text-sage">{money(quote.first_quoted_total)} → {money(quote.binding_total)}</p>}</div></li>)}</ol></>}
  </div>;
}
