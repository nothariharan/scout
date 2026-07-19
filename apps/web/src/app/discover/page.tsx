"use client";

import { useEffect, useMemo, useState } from "react";

type Candidate = {
  listing_id: string;
  listing_name: string;
  phone?: string;
  source?: string;
  distance_km?: number;
  address?: string;
};

type OutcomeBrief = {
  vertical?: string;
  task_type?: string;
  deal_type?: string;
  outcome?: string;
  location?: { area?: string; city?: string };
  origin?: { area?: string; city?: string };
  destination?: { area?: string; city?: string };
  budget?: { ideal?: number; ceiling?: number; currency?: string };
  supplied_targets?: string[];
};

export default function DiscoverPage() {
  const [brief, setBrief] = useState<OutcomeBrief | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [addingManual, setAddingManual] = useState(false);

  const requirementId =
    typeof window === "undefined"
      ? null
      : localStorage.getItem("scout_requirement_id") ??
        localStorage.getItem("scout_real_estate_requirement_id") ??
        localStorage.getItem("scout_moving_requirement_id");
  const callable = useMemo(() => candidates.filter((candidate) => candidate.phone), [candidates]);

  useEffect(() => {
    if (!requirementId) return;
    void fetch(`/api/orchestrator/requirements/${requirementId}`, { cache: "no-store" })
      .then(async (response) => {
        const record = await response.json();
        if (!response.ok) throw new Error(record.error ?? "Could not load the confirmed outcome.");
        setBrief(record.spec);
        if (record.candidates?.length) {
          setCandidates(record.candidates);
          setSelected(
            new Set(
              record.candidates
                .filter((candidate: Candidate) => candidate.phone)
                .map((candidate: Candidate) => candidate.listing_id),
            ),
          );
        }
      })
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Could not load the confirmed outcome."),
      );
  }, [requirementId]);

  function toggle(id: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function search() {
    if (!requirementId) {
      setError("Start by confirming an outcome.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const serviceType =
        brief?.task_type ??
        (brief?.vertical === "moving" ? "moving" : brief?.deal_type ?? "local service");
      const response = await fetch(`/api/orchestrator/requirements/${requirementId}/discover`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ service_type: serviceType, radius_meters: 8000, limit: 12 }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Target discovery failed.");
      const found = result.candidates ?? [];
      setCandidates(found);
      setSelected(
        new Set(
          found
            .filter((candidate: Candidate) => candidate.phone)
            .map((candidate: Candidate) => candidate.listing_id),
        ),
      );
      if (!found.length) {
        setError("No published targets were found. Add authorized contacts manually or broaden the search area.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Target discovery failed.");
    } finally {
      setLoading(false);
    }
  }

  async function dispatch() {
    if (!requirementId) {
      setError("Confirm an outcome before starting calls.");
      return;
    }
    setDispatching(true);
    setError(null);
    try {
      const response = await fetch(`/api/orchestrator/requirements/${requirementId}/dispatch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listing_ids: [...selected] }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not prepare calls.");
      localStorage.setItem("scout_dispatch", JSON.stringify(result.calls));
      window.location.assign("/calls");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not prepare calls.");
    } finally {
      setDispatching(false);
    }
  }

  async function addManualContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requirementId) {
      setError("Confirm an outcome before adding a contact.");
      return;
    }
    setAddingManual(true);
    setError(null);
    try {
      const response = await fetch(`/api/orchestrator/requirements/${requirementId}/candidates`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          listing_name: manualName,
          phone: manualPhone,
          service_type: brief?.task_type ?? brief?.deal_type ?? "custom",
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not add the contact.");
      setCandidates((current) => [...current, result.candidate]);
      setSelected((current) => new Set([...current, result.candidate.listing_id]));
      setManualName("");
      setManualPhone("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add the contact.");
    } finally {
      setAddingManual(false);
    }
  }

  const searchArea =
    [brief?.location?.area, brief?.location?.city].filter(Boolean).join(", ") ||
    [brief?.origin?.area, brief?.origin?.city].filter(Boolean).join(", ") ||
    "Use supplied contacts";
  const outcome =
    brief?.outcome ||
    (brief?.vertical === "moving"
      ? `Arrange a move to ${[brief.destination?.area, brief.destination?.city].filter(Boolean).join(", ") || "the destination"}`
      : "Contact and compare the strongest matching targets");
  const taskLabel = (brief?.task_type ?? brief?.vertical ?? brief?.deal_type ?? "outbound task")
    .replace(/_/g, " ");

  return (
    <div className="state-page">
      <header className="state-page-head">
        <div>
          <p>TARGET DISCOVERY</p>
          <h1>Choose who Scout should contact.</h1>
          <span>Scout can discover relevant businesses or use the authorized contacts you supplied.</span>
        </div>
        <div className="state-actions">
          <button onClick={() => void search()} disabled={loading} className="btn-ghost">
            {loading ? "Finding targets..." : "Find targets"}
          </button>
          <span>{selected.size} selected</span>
          <button onClick={() => void dispatch()} disabled={!selected.size || dispatching} className="btn">
            {dispatching ? "Preparing..." : "Start calls"}
          </button>
        </div>
      </header>

      {!requirementId && (
        <p className="state-error">
          No confirmed outcome yet. <a href="/delegate">Tell Scout what you need.</a>
        </p>
      )}
      {error && <p className="state-error">{error}</p>}

      <section className="state-summary-grid">
        <div><p>OUTCOME</p><strong>{outcome}</strong></div>
        <div><p>SEARCH AREA</p><strong>{searchArea}</strong></div>
        <div><p>WORKFLOW</p><strong>{taskLabel}</strong><small>{callable.length} callable targets</small></div>
      </section>

      <details className="state-manual-contact">
        <summary>Add an authorized contact</summary>
        <p>Use a public business number or a contact you are authorized to call. Scout records the source and never invents a number.</p>
        <form onSubmit={addManualContact}>
          <input value={manualName} onChange={(event) => setManualName(event.target.value)} required placeholder="Target or company name" />
          <input value={manualPhone} onChange={(event) => setManualPhone(event.target.value)} required pattern="\+[1-9][0-9]{7,14}" placeholder="+919876543210" />
          <button disabled={addingManual} className="btn">{addingManual ? "Adding..." : "Add contact"}</button>
        </form>
      </details>

      <ol className="state-target-list">
        {!candidates.length && (
          <li className="empty-targets">Find targets or add contacts to build Scout's call list.</li>
        )}
        {candidates.map((candidate, index) => {
          const isSelected = selected.has(candidate.listing_id);
          const canCall = Boolean(candidate.phone);
          return (
            <li key={candidate.listing_id}>
              <span className="target-index">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{candidate.listing_name}</strong>
                <small>
                  {candidate.source ?? "user supplied"}
                  {candidate.distance_km != null ? ` · ${candidate.distance_km} km` : ""}
                  {candidate.address ? ` · ${candidate.address}` : ""}
                </small>
                <p>{canCall ? candidate.phone : "No verified phone number - review only"}</p>
              </div>
              <label data-disabled={!canCall}>
                <input type="checkbox" disabled={!canCall} checked={isSelected} onChange={() => toggle(candidate.listing_id)} />
                {isSelected ? "Will call" : "Skip"}
              </label>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
