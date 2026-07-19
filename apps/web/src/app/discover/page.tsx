"use client";

import { useEffect, useMemo, useState } from "react";

type Candidate = {
  listing_id: string;
  listing_name: string;
  phone?: string;
  source?: string;
  distance_km?: number;
  commute_minutes?: number;
  address?: string;
};

type MovingBrief = { origin?: { area?: string; city?: string }; destination?: { area?: string; city?: string }; home_size?: string; budget?: { ideal?: number; ceiling?: number; currency?: string } };

export default function DiscoverPage() {
  const [brief, setBrief] = useState<MovingBrief | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [addingManual, setAddingManual] = useState(false);

  const requirementId = typeof window === "undefined" ? null : localStorage.getItem("scout_moving_requirement_id") ?? localStorage.getItem("scout_requirement_id");
  const callable = useMemo(() => candidates.filter((candidate) => candidate.phone), [candidates]);

  useEffect(() => {
    if (!requirementId) return;
    void fetch(`/api/orchestrator/requirements/${requirementId}`, { cache: "no-store" })
      .then(async (response) => {
        const record = await response.json();
        if (!response.ok) throw new Error(record.error ?? "Could not load moving brief.");
        setBrief(record.spec);
        if (record.candidates?.length) {
          setCandidates(record.candidates);
          setSelected(new Set(record.candidates.filter((candidate: Candidate) => candidate.phone).map((candidate: Candidate) => candidate.listing_id)));
        }
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load moving brief."));
  }, [requirementId]);

  function toggle(id: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function search() {
    if (!requirementId) { setError("Start by confirming a moving brief in Intake."); return; }
    setLoading(true); setError(null);
    try {
      const response = await fetch(`/api/orchestrator/requirements/${requirementId}/discover`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ service_type: "moving", radius_meters: 8000, limit: 12 }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "OpenStreetMap discovery failed.");
      const found = result.candidates ?? [];
      setCandidates(found);
      setSelected(new Set(found.filter((candidate: Candidate) => candidate.phone).map((candidate: Candidate) => candidate.listing_id)));
      if (!found.length) setError("OpenStreetMap found no published moving-company listings here. Add a company manually or try a broader locality.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "OpenStreetMap discovery failed."); }
    finally { setLoading(false); }
  }

  async function dispatch() {
    if (!requirementId) { setError("Confirm a moving brief before dispatch."); return; }
    setDispatching(true); setError(null);
    try {
      const response = await fetch(`/api/orchestrator/requirements/${requirementId}/dispatch`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ listing_ids: [...selected] }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Dispatch failed.");
      localStorage.setItem("scout_dispatch", JSON.stringify(result.calls));
      window.location.assign("/calls");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Dispatch failed."); }
    finally { setDispatching(false); }
  }

  async function addManualContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requirementId) { setError("Confirm a moving brief before adding a test contact."); return; }
    setAddingManual(true); setError(null);
    try {
      const response = await fetch(`/api/orchestrator/requirements/${requirementId}/candidates`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ listing_name: manualName, phone: manualPhone }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not add test contact.");
      setCandidates((current) => [...current, result.candidate]);
      setSelected((current) => new Set([...current, result.candidate.listing_id]));
      setManualName(""); setManualPhone("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add test contact."); }
    finally { setAddingManual(false); }
  }

  const origin = [brief?.origin?.area, brief?.origin?.city].filter(Boolean).join(", ") || "your origin";
  const destination = [brief?.destination?.area, brief?.destination?.city].filter(Boolean).join(", ") || "destination";

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="mono text-[11px] uppercase tracking-[0.18em] text-rust">Moving pilot · OpenStreetMap discovery</p><h1 className="mt-2 text-2xl">Find movers before Scout calls.</h1><p className="mt-1 text-sm text-charcoal/70">{origin} → {destination}. Select only businesses with a published phone number for a real outbound test.</p></div>
      <div className="flex flex-wrap items-center gap-3"><button onClick={search} disabled={loading} className="btn-ghost">{loading ? "SEARCHING…" : "SEARCH OSM"}</button><span className="pill">{selected.size} SELECTED</span><button onClick={dispatch} disabled={!selected.size || dispatching} className={`btn ${selected.size ? "" : "opacity-40"}`}>{dispatching ? "PREPARING…" : "DISPATCH →"}</button></div>
    </header>

    <div className="wire" />
    {!requirementId && <p className="mono text-[11px] text-red">No confirmed moving brief yet. <a className="underline" href="/moving">Create one first.</a></p>}
    {error && <p className="mono text-[11px] text-red">{error}</p>}

    <section className="grid gap-4 md:grid-cols-3">
      <div className="card p-4"><p className="mono text-[10px] uppercase text-charcoal/50">Route</p><p className="mt-2 text-sm">{origin} → {destination}</p></div>
      <div className="card p-4"><p className="mono text-[10px] uppercase text-charcoal/50">Move scope</p><p className="mt-2 text-sm">{brief?.home_size?.replace(/_/g, " ") ?? "Not confirmed"}</p></div>
      <div className="card p-4"><p className="mono text-[10px] uppercase text-charcoal/50">Callable listings</p><p className="mt-2 text-sm">{callable.length} with published phone numbers</p></div>
    </section>

    <details className="card p-4"><summary className="cursor-pointer font-medium text-ink">Add a consented test contact</summary><p className="mt-2 text-sm text-charcoal/65">Use this only for a number you are authorized to call, such as your own verified trial number. Scout requires E.164 format and still keeps outbound calling disabled until you explicitly enable it.</p><form onSubmit={addManualContact} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><input value={manualName} onChange={(event) => setManualName(event.target.value)} required className="rounded-lg border border-white/80 bg-white/55 px-3 py-2 text-sm text-charcoal" placeholder="Test contact name" /><input value={manualPhone} onChange={(event) => setManualPhone(event.target.value)} required pattern="\+[1-9][0-9]{7,14}" className="rounded-lg border border-white/80 bg-white/55 px-3 py-2 text-sm text-charcoal" placeholder="+16055550123" /><button disabled={addingManual} className="btn justify-center">{addingManual ? "ADDING…" : "ADD TEST CONTACT"}</button></form></details>

    <ol className="card divide-y divide-line">
      {!candidates.length && <li className="p-6 text-sm text-charcoal/60">Search OpenStreetMap to build the call list. Scout does not invent vendors or phone numbers.</li>}
      {candidates.map((candidate, index) => {
        const isSelected = selected.has(candidate.listing_id);
        const canCall = Boolean(candidate.phone);
        return <li key={candidate.listing_id} className="flex items-center gap-4 p-4"><span className="call-idx w-9 shrink-0">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0 flex-1"><p className="font-medium text-ink">{candidate.listing_name}</p><p className="mono mt-1 text-[11px] text-charcoal/55">{candidate.source ?? "openstreetmap"}{candidate.distance_km != null ? ` · ${candidate.distance_km} km` : ""}{candidate.address ? ` · ${candidate.address}` : ""}</p><p className="mono mt-1 text-[11px] text-charcoal/65">{canCall ? candidate.phone : "No published phone number — research only"}</p></div><label className={`mono flex items-center gap-2 text-[11px] ${canCall ? "cursor-pointer" : "opacity-40"}`}><input type="checkbox" disabled={!canCall} checked={isSelected} onChange={() => toggle(candidate.listing_id)} style={{ accentColor: "var(--rust)" }} className="h-4 w-4" />{isSelected ? "WILL CALL" : "SKIP"}</label></li>;
      })}
    </ol>
  </div>;
}
