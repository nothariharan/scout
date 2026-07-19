"use client";

import { useCallback, useEffect, useState } from "react";

type Call = { call_id: string; listing_id: string; listing_name: string; phone?: string; state: "queued" | "in_progress" | "completed"; transcript?: string; outcome?: { status?: string; reason?: string }; provider?: string; provider_conversation_id?: string };

const label: Record<Call["state"], string> = { queued: "QUEUED", in_progress: "LIVE", completed: "COMPLETE" };

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    const id = localStorage.getItem("scout_moving_requirement_id") ?? localStorage.getItem("scout_requirement_id");
    if (!id) { setCalls([]); setError("No confirmed moving brief. Start in Intake before dispatching calls."); setLoading(false); return; }
    try {
      const response = await fetch(`/api/orchestrator/requirements/${id}/calls`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not load call activity.");
      setCalls(result.calls ?? []); setError(null); setRefreshedAt(new Date().toLocaleTimeString());
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load call activity."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    const events = new EventSource("/api/orchestrator/events");
    events.onmessage = () => void load();
    // Polling remains a fallback for a local server restart or an SSE proxy
    // that a restrictive deployment platform does not keep open.
    events.onerror = () => events.close();
    return () => { window.clearInterval(timer); events.close(); };
  }, [load]);

  const live = calls.filter((call) => call.state === "in_progress").length;
  const complete = calls.filter((call) => call.state === "completed").length;

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="mono text-[11px] uppercase tracking-[0.18em] text-rust">Moving pilot · truthful call ledger</p><h1 className="mt-2 text-2xl">Call activity.</h1><p className="mt-1 text-sm text-charcoal/70">{live ? `${live} live call${live === 1 ? "" : "s"}.` : `${complete} completed call${complete === 1 ? "" : "s"}; queued calls will not dial until outbound calling is enabled.`}</p></div><div className="flex items-center gap-3"><button onClick={() => void load()} className="btn-ghost">REFRESH</button><a href="/moving/report" className="btn">VIEW REPORT →</a></div></header>
    <div className="wire" />
    {error && <p className="mono text-[11px] text-rust">{error}</p>}
    {!error && <p className="mono text-[10px] uppercase tracking-wide text-charcoal/45">{refreshedAt ? `Last refreshed ${refreshedAt} · polling every 5 seconds` : "Connecting to orchestrator…"}</p>}
    <ol className="card divide-y divide-line">
      {loading && !calls.length && <li className="p-6 text-sm text-charcoal/60">Loading dispatched moving calls…</li>}
      {!loading && !calls.length && !error && <li className="p-6 text-sm text-charcoal/60">No mover has been dispatched. Go to Discovery, select a published business number, then dispatch a consented test.</li>}
      {calls.map((call, index) => <li key={call.call_id} className="grid gap-3 p-5 sm:grid-cols-[44px_1fr_auto]"><span className="call-idx">{String(index + 1).padStart(2, "0")}</span><div><p className="font-medium text-ink">{call.listing_name}</p><p className="mono mt-1 text-[11px] text-charcoal/55">{call.phone ?? "No public number"} · {call.call_id}</p>{call.transcript && <p className="mt-3 border-l-2 border-line pl-3 text-sm text-charcoal/70">{call.transcript}</p>}{call.outcome?.reason && <p className="mono mt-2 text-[11px] text-charcoal/55">{call.outcome.reason}</p>}</div><div className="sm:text-right"><span className={`pill ${call.state === "in_progress" ? "pill-sage" : ""}`}>{call.outcome?.status?.replace(/_/g, " ") ?? label[call.state]}</span><p className="mono mt-2 text-[10px] uppercase text-charcoal/45">{call.provider ?? "not placed"}</p></div></li>)}
    </ol>
  </div>;
}
