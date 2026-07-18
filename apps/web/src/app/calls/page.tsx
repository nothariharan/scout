"use client";

import { useEffect, useRef, useState } from "react";
import { DEMO_CALLS } from "@/lib/demo-data";
import type { CallPhase, CallRecord, CallStreamEvent } from "@/lib/types";
import { TranscriptView } from "@/components/TranscriptView";
import { RiskBadge } from "@/components/RiskBadge";
import { OUTCOME_LABEL, inr } from "@/lib/format";

const PHASE_LABEL: Record<CallPhase, string> = {
  queued: "QUEUED",
  dialing: "DIALING",
  live: "LIVE",
  completed: "DONE",
  failed: "FAILED",
};

function blankCalls(): CallRecord[] {
  return DEMO_CALLS.map((c) => ({
    ...c,
    phase: "queued",
    transcript: [],
    outcome: undefined,
    quote: undefined,
  }));
}

export default function CallsPage() {
  const [calls, setCalls] = useState<CallRecord[]>(blankCalls);
  const [done, setDone] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const esRef = useRef<EventSource | null>(null);

  function start() {
    esRef.current?.close();
    setDone(false);
    setCalls(blankCalls());
    const es = new EventSource("/api/calls/stream");
    esRef.current = es;
    es.onmessage = (ev) => {
      const e: CallStreamEvent = JSON.parse(ev.data);
      if (e.type === "done") {
        setDone(true);
        es.close();
        return;
      }
      setCalls((prev) =>
        prev.map((c) => {
          if (!("listing_id" in e) || c.listing_id !== e.listing_id) return c;
          if (e.type === "phase") return { ...c, phase: e.phase };
          if (e.type === "line") return { ...c, transcript: [...c.transcript, e.line] };
          if (e.type === "outcome") return { ...c, outcome: e.outcome, quote: e.quote };
          return c;
        })
      );
    };
    es.onerror = () => es.close();
  }

  useEffect(() => {
    start();
    return () => esRef.current?.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const liveCount = calls.filter((c) => c.phase === "live" || c.phase === "dialing").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">Live activity</h1>
          <p className="mt-1 text-sm text-charcoal/70">
            {liveCount > 0
              ? `${liveCount} call${liveCount > 1 ? "s" : ""} in progress.`
              : done
                ? "All calls complete."
                : "Connecting…"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={start} className="btn-ghost">
            ↻ REPLAY
          </button>
          <a href="/report/req_demo_koramangala_pg" aria-disabled={!done}
            className={`btn ${done ? "" : "pointer-events-none opacity-40"}`}>
            REPORT →
          </a>
        </div>
      </header>

      <div className="wire" />

      <ol>
        {calls.map((c, i) => {
          const isOpen = open[c.listing_id] ?? false;
          const live = c.phase === "live" || c.phase === "dialing";
          return (
            <li key={c.listing_id}>
              <button
                onClick={() => setOpen((o) => ({ ...o, [c.listing_id]: !isOpen }))}
                className="flex w-full items-center gap-4 py-4 text-left"
              >
                <span className="call-idx w-12 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-ink">{c.listing_name}</div>
                  <div className="mono mt-0.5 text-[11px] uppercase tracking-wide text-charcoal/55">
                    STYLE: {c.persona}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {c.quote && <RiskBadge flag={c.quote.risk_flag} />}
                  {c.outcome ? (
                    <span className="pill">{OUTCOME_LABEL[c.outcome.status].toUpperCase()}</span>
                  ) : (
                    <span className="mono flex items-center gap-1.5 text-[11px]"
                      style={{ color: live ? "var(--rust)" : "var(--charcoal)" }}>
                      {live && (
                        <span className="pulse inline-block h-2 w-2 rounded-full"
                          style={{ background: "var(--rust)" }} />
                      )}
                      {PHASE_LABEL[c.phase]}
                    </span>
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="pb-5 pl-16">
                  <div className="wire mb-3" />
                  {c.quote && (
                    <div className="mono mb-3 flex flex-wrap items-center gap-3 text-[12px]">
                      <span className="text-charcoal/60">
                        effective <span className="text-ink">{inr(c.quote.effective_monthly_cost)}/mo</span>
                      </span>
                      {c.quote.price_moved && (
                        <span className="pill pill-sage">
                          MOVED {inr(c.quote.first_quoted_effective)} → {inr(c.quote.final_quoted_effective)}
                        </span>
                      )}
                    </div>
                  )}
                  {c.transcript.length > 0 ? (
                    <TranscriptView lines={c.transcript} />
                  ) : (
                    <p className="mono text-[12px] text-charcoal/50">Waiting for connect…</p>
                  )}
                </div>
              )}
              <div className="wire" />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
