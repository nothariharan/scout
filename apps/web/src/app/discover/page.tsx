"use client";

import { useMemo, useState } from "react";
import { DEMO_CANDIDATES, DEMO_REQUIREMENT } from "@/lib/demo-data";
import { MapPanel } from "@/components/MapPanel";
import { inr } from "@/lib/format";

export default function DiscoverPage() {
  const spec = DEMO_REQUIREMENT.spec;
  const [candidates, setCandidates] = useState(DEMO_CANDIDATES);
  const [loading, setLoading] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [liveMode, setLiveMode] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const maxCommute = spec.commute_constraint?.max_minutes ?? Infinity;

  const inScope = useMemo(
    () => candidates.filter((c) => (c.commute_minutes ?? 0) <= maxCommute),
    [candidates, maxCommute]
  );
  const outOfScope = candidates.filter((c) => (c.commute_minutes ?? 0) > maxCommute);

  const [selected, setSelected] = useState<Set<string>>(() => new Set(inScope.map((c) => c.listing_id)));
  const [activeId, setActiveId] = useState<string | undefined>(inScope[0]?.listing_id);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function searchOpenStreetMap() {
    const requirementId = localStorage.getItem("scout_requirement_id");
    if (!requirementId) { setDiscoveryError("Confirm a requirement in Intake before live discovery."); return; }
    setLoading(true); setDiscoveryError(null);
    try {
      const response = await fetch(`/api/orchestrator/requirements/${requirementId}/discover`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ service_type: "moving", radius_meters: 8000, limit: 12 }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "OpenStreetMap discovery failed.");
      const found = result.candidates ?? [];
      setCandidates(found);
      setSelected(new Set(found.filter((candidate: { phone?: string }) => candidate.phone).map((candidate: { listing_id: string }) => candidate.listing_id)));
      setActiveId(found[0]?.listing_id);
      setLiveMode(true);
    } catch (error) { setDiscoveryError(error instanceof Error ? error.message : "OpenStreetMap discovery failed."); }
    finally { setLoading(false); }
  }

  async function dispatch() {
    const requirementId = localStorage.getItem("scout_requirement_id");
    if (!requirementId) { setDiscoveryError("Confirm a requirement before dispatch."); return; }
    setDispatching(true); setDiscoveryError(null);
    try {
      const response = await fetch(`/api/orchestrator/requirements/${requirementId}/dispatch`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ listing_ids: [...selected] }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Dispatch failed.");
      localStorage.setItem("scout_dispatch", JSON.stringify(result.calls));
      window.location.assign("/calls");
    } catch (error) { setDiscoveryError(error instanceof Error ? error.message : "Dispatch failed."); }
    finally { setDispatching(false); }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">Discover &amp; geofence</h1>
          <p className="mt-1 text-sm text-charcoal/70">
            Filtered by radius and commute time before any call goes out.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={searchOpenStreetMap} disabled={loading} className="btn-ghost">
            {loading ? "SEARCHING OSM…" : "SEARCH OSM"}
          </button>
          <span className="pill">{selected.size} SELECTED</span>
          <button onClick={dispatch} disabled={selected.size === 0 || dispatching}
            className={`btn ${selected.size ? "" : "opacity-40"}`}>
            DISPATCH →
          </button>
        </div>
      </header>

      <div className="wire" />
      {discoveryError && <p className="mono text-[11px] text-rust">{discoveryError}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <ol>
          {inScope.map((c, i) => {
            const on = selected.has(c.listing_id);
            return (
              <li key={c.listing_id}>
                <div
                  onMouseEnter={() => setActiveId(c.listing_id)}
                  className="flex items-start gap-4 py-4"
                  style={{ opacity: on ? 1 : 0.5 }}
                >
                  <span className="call-idx w-10 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-ink">{c.listing_name}</div>
                        <div className="mono mt-0.5 text-[11px] text-charcoal/55">
                          {c.source} · {c.distance_km} km · {c.commute_minutes} min
                        </div>
                      </div>
                      <label className="mono flex cursor-pointer items-center gap-2 text-[11px] text-charcoal/60">
                        <input type="checkbox" checked={on} onChange={() => toggle(c.listing_id)}
                          style={{ accentColor: "var(--rust)" }} className="h-4 w-4" />
                        {on ? "WILL CALL" : "SKIPPED"}
                      </label>
                    </div>
                    <div className="mono mt-2 text-sm">
                      <span className="text-charcoal/55">advertised </span>
                      <span className="text-ink">{inr(c.advertised_rent)}</span>
                      <span className="ml-2 text-[11px] text-charcoal/45">headline only</span>
                    </div>
                  </div>
                </div>
                <div className="wire" />
              </li>
            );
          })}

          {outOfScope.length > 0 && (
            <li className="mono py-4 text-[11px] text-charcoal/50">
              {outOfScope.length} excluded over the {maxCommute}-min commute cap — before dispatch, not after.
            </li>
          )}
        </ol>

        <div className="h-[360px]">
          <MapPanel spec={spec} candidates={inScope} selectedIds={selected} activeId={activeId} />
        </div>
      </div>
    </div>
  );
}
