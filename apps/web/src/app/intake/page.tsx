"use client";

import { useMemo, useState } from "react";
import { DEMO_REQUIREMENT } from "@/lib/demo-data";
import type { RequirementSpec, SourcePath } from "@/lib/types";
import { inr } from "@/lib/format";

type Tab = "voice" | "document" | "text";

const TABS: { id: Tab; label: string; blurb: string }[] = [
  { id: "voice", label: "VOICE", blurb: "One question at a time, via the intake-concierge agent." },
  { id: "document", label: "DOCUMENT", blurb: "Screenshot, quote, or rental PDF — parsed by Claude vision." },
  { id: "text", label: "FREE TEXT", blurb: "Describe what you need in a sentence." },
];

const INPUT =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-rust";

export default function IntakePage() {
  const [tab, setTab] = useState<Tab>("voice");
  const [spec, setSpec] = useState<RequirementSpec>(DEMO_REQUIREMENT.spec);
  const [sourcePath, setSourcePath] = useState<SourcePath>("both");
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [requirementId, setRequirementId] = useState<string | null>(null);
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");

  const withinBudget = spec.budget.ideal <= spec.budget.ceiling;
  const ready = withinBudget && spec.location.area.trim() !== "" && !!spec.move_in_date;
  const commuteLabel = useMemo(
    () => (spec.commute_constraint ? `${spec.commute_constraint.max_minutes} min` : "—"),
    [spec.commute_constraint]
  );

  function update<K extends keyof RequirementSpec>(key: K, value: RequirementSpec[K]) {
    setSpec((s) => ({ ...s, [key]: value }));
    setConfirmedAt(null);
  }

  function simulateParse(kind: Tab) {
    setSpec(DEMO_REQUIREMENT.spec);
    setSourcePath(kind === "document" ? "document" : "voice");
  }

  async function confirm() {
    setConfirmationError(null);
    try {
      const created = await fetch("/api/orchestrator/requirements", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ spec, source_path: sourcePath }) });
      if (!created.ok) throw new Error("Scout could not save this requirement.");
      const record = await created.json();
      const confirmed = await fetch(`/api/orchestrator/requirements/${record.id}/confirm`, { method: "POST" });
      if (!confirmed.ok) throw new Error("Scout could not confirm this requirement.");
      const result = await confirmed.json();
      localStorage.setItem("scout_requirement_id", result.id);
      setRequirementId(result.id);
      setConfirmedAt(result.confirmed_at);
    } catch (error) {
      setConfirmationError(error instanceof Error ? error.message : "Could not confirm requirement.");
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Requirement intake</h1>
        <p className="mt-1 text-sm text-charcoal/70">Capture once. Confirm. Reused verbatim on every call.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
        {/* Capture */}
        <section className="space-y-4">
          <div className="flex gap-5 border-b border-line">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className="tab" data-active={tab === t.id}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="card p-5">
            <p className="text-sm text-charcoal/70">{TABS.find((t) => t.id === tab)!.blurb}</p>

            {tab === "voice" && (
              <div className="mt-4 space-y-3">
                <div
                  className="flex items-center justify-between gap-3 rounded-md p-4"
                  style={{ background: "var(--paper-2)" }}
                >
                  <div className="text-sm">
                    <div className="serif text-base text-ink">intake-concierge</div>
                    <div className="mono text-[11px] text-charcoal/60">
                      widget mounts when ELEVENLABS_INTAKE_AGENT_ID is set
                    </div>
                  </div>
                  <span className="pill">STANDBY</span>
                </div>
                <button onClick={() => simulateParse("voice")} className="btn-ghost">
                  SIMULATE INTERVIEW →
                </button>
              </div>
            )}

            {tab === "document" && (
              <div className="mt-4 space-y-3">
                <label
                  className="flex cursor-pointer flex-col items-center gap-1 rounded-md border border-dashed border-line p-8 text-center text-sm text-charcoal/60 hover:border-rust"
                  style={{ background: "var(--paper-2)" }}
                >
                  <span className="serif text-lg text-ink">Drop a listing, quote, or PDF</span>
                  <span className="mono text-[11px]">parsed to the same spec · never stored in Git</span>
                  <input type="file" className="hidden" onChange={() => simulateParse("document")} />
                </label>
              </div>
            )}

            {tab === "text" && (
              <div className="mt-4 space-y-3">
                <textarea
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  placeholder="Single PG in Koramangala, food included, move in Aug 1, under ₹16k, near HSR."
                  className={`${INPUT} h-28 resize-none`}
                />
                <button onClick={() => simulateParse("text")} disabled={!freeText.trim()} className="btn-ghost">
                  PARSE →
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Review */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="mono text-xs uppercase tracking-widest text-charcoal/55">Review · editable</h2>
            <span className="pill">SOURCE: {sourcePath.toUpperCase()}</span>
          </div>

          <div className="card space-y-4 p-5">
            <Field label="Deal type">
              <select
                value={spec.deal_type}
                onChange={(e) => update("deal_type", e.target.value as RequirementSpec["deal_type"])}
                className={INPUT}
              >
                <option value="pg">PG</option>
                <option value="short_stay_rental">Short-stay rental</option>
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Area">
                <input className={INPUT} value={spec.location.area}
                  onChange={(e) => update("location", { ...spec.location, area: e.target.value })} />
              </Field>
              <Field label="City">
                <input className={INPUT} value={spec.location.city}
                  onChange={(e) => update("location", { ...spec.location, city: e.target.value })} />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Ideal / mo">
                <input type="number" className={INPUT} value={spec.budget.ideal}
                  onChange={(e) => update("budget", { ...spec.budget, ideal: Number(e.target.value) })} />
              </Field>
              <Field label="Ceiling / mo">
                <input type="number" className={INPUT} value={spec.budget.ceiling}
                  onChange={(e) => update("budget", { ...spec.budget, ceiling: Number(e.target.value) })} />
              </Field>
              <Field label="Move-in">
                <input type="date" className={INPUT} value={spec.move_in_date}
                  onChange={(e) => update("move_in_date", e.target.value)} />
              </Field>
            </div>

            {!withinBudget && (
              <p className="pill pill-rust">
                Ideal {inr(spec.budget.ideal)} exceeds ceiling {inr(spec.budget.ceiling)}
              </p>
            )}

            <Field label="Posture">
              <div className="flex gap-1">
                {(["aggressive", "balanced", "fast"] as const).map((p) => (
                  <button key={p} onClick={() => update("negotiation_posture", p)}
                    className="mono flex-1 rounded-md border px-2 py-1.5 text-xs uppercase"
                    style={{
                      borderColor: spec.negotiation_posture === p ? "var(--rust)" : "var(--line)",
                      color: spec.negotiation_posture === p ? "var(--rust)" : "var(--charcoal)",
                      background: spec.negotiation_posture === p ? "#f4ddd3" : "transparent",
                    }}>
                    {p}
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Meta label="Occupancy" value={String(spec.occupancy)} />
              <Meta label="Furnishing" value={spec.furnishing} />
              <Meta label="Max commute" value={commuteLabel} />
              <Meta label="Lease" value={`${spec.lease_duration_months} mo`} />
            </div>

            <div>
              <div className="mono mb-1.5 text-[11px] uppercase tracking-wide text-charcoal/55">Amenities</div>
              <div className="flex flex-wrap gap-1.5">
                {(spec.amenities ?? []).map((a) => (
                  <span key={a} className="pill">{a.replace(/_/g, " ")}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="card flex items-center justify-between p-4">
            <span className="mono text-[11px]" style={{ color: confirmedAt ? "var(--sage)" : "var(--charcoal)" }}>
              {confirmedAt ? "✓ CONFIRMED · LOCKED FOR DISPATCH" : "Nothing dials until confirmed."}
            </span>
            <div className="flex gap-2">
              <button onClick={confirm} disabled={!ready} className="btn">
                CONFIRM
              </button>
              <a href="/discover" aria-disabled={!confirmedAt || !requirementId}
                className={`btn-ghost ${confirmedAt && requirementId ? "" : "pointer-events-none opacity-40"}`}>
                DISCOVER →
              </a>
            </div>
          </div>
          {confirmationError && <p className="mono text-[11px] text-rust">{confirmationError}</p>}
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mono mb-1 block text-[11px] uppercase tracking-wide text-charcoal/55">{label}</span>
      {children}
    </label>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md p-3" style={{ background: "var(--paper-2)" }}>
      <div className="mono text-[10px] uppercase tracking-wide text-charcoal/55">{label}</div>
      <div className="mt-0.5 text-sm capitalize text-ink">{value}</div>
    </div>
  );
}
