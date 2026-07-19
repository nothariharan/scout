"use client";

import { useCallback, useEffect, useState } from "react";

type Call = {
  call_id: string;
  listing_id: string;
  listing_name: string;
  phone?: string;
  state: "queued" | "in_progress" | "completed";
  transcript?: string;
  outcome?: { status?: string; reason?: string };
  provider?: string;
};

const stateLabel: Record<Call["state"], string> = {
  queued: "Queued",
  in_progress: "Live",
  completed: "Complete",
};

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    const id =
      localStorage.getItem("scout_requirement_id") ??
      localStorage.getItem("scout_real_estate_requirement_id") ??
      localStorage.getItem("scout_moving_requirement_id");
    if (!id) {
      setCalls([]);
      setError("No confirmed outcome. Tell Scout what you need before starting calls.");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`/api/orchestrator/requirements/${id}/calls`, {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not load conversations.");
      setCalls(result.calls ?? []);
      setError(null);
      setRefreshedAt(new Date().toLocaleTimeString());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load conversations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    const events = new EventSource("/api/orchestrator/events");
    events.onmessage = () => void load();
    events.onerror = () => events.close();
    return () => {
      window.clearInterval(timer);
      events.close();
    };
  }, [load]);

  const live = calls.filter((call) => call.state === "in_progress").length;
  const complete = calls.filter((call) => call.state === "completed").length;

  return (
    <div className="state-page">
      <header className="state-page-head">
        <div>
          <p>OUTBOUND CONVERSATIONS</p>
          <h1>Every call, follow-up, and outcome.</h1>
          <span>
            {live
              ? `${live} live conversation${live === 1 ? "" : "s"}.`
              : `${complete} completed conversation${complete === 1 ? "" : "s"}.`}
          </span>
        </div>
        <div className="state-actions">
          <button onClick={() => void load()} className="btn-ghost">Refresh</button>
          <a href="/report" className="btn">View results</a>
        </div>
      </header>

      {error && <p className="state-error">{error}</p>}
      {!error && (
        <p className="state-refresh">
          {refreshedAt ? `Updated ${refreshedAt} · refreshing every 5 seconds` : "Connecting to Scout..."}
        </p>
      )}

      <ol className="state-call-list">
        {loading && !calls.length && <li className="empty-targets">Loading conversations...</li>}
        {!loading && !calls.length && !error && (
          <li className="empty-targets">No targets have been dispatched. Choose targets first, then start calls.</li>
        )}
        {calls.map((call, index) => (
          <li key={call.call_id}>
            <span className="target-index">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>{call.listing_name}</strong>
              <small>{call.phone ?? "No public number"} · {call.call_id}</small>
              {call.transcript && <blockquote>{call.transcript}</blockquote>}
              {call.outcome?.reason && <p>{call.outcome.reason}</p>}
            </div>
            <div className="call-state">
              <span data-state={call.state}>
                {call.outcome?.status?.replace(/_/g, " ") ?? stateLabel[call.state]}
              </span>
              <small>{call.provider ?? "Not placed"}</small>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
