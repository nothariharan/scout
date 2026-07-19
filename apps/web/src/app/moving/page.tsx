"use client";

import { useMemo, useState } from "react";
import type { MovingRequest } from "@scout/contracts/types";
import { VoiceIntakePanel } from "@/components/VoiceIntakePanel";

const INPUT = "w-full rounded-lg border border-white/75 bg-white/30 px-3 py-2 text-sm text-charcoal outline-none backdrop-blur focus:border-rust";
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

export default function MovingIntakePage() {
  const [request, setRequest] = useState<MovingRequest>({
    vertical: "moving", origin: { area: "", city: "" }, destination: { area: "", city: "" }, move_date: tomorrow,
    home_size: "1_bed", inventory_notes: "", services: { packing: true, insurance: true },
    stairs: { origin_floors: 0, destination_floors: 0, elevator_origin: true, elevator_destination: true },
    budget: { ideal: 1800, ceiling: 2200, currency: "USD" }, negotiation_posture: "balanced", language_pref: "en",
  });
  const [status, setStatus] = useState<string | null>(null);
  const ready = Boolean(request.origin.area && request.origin.city && request.destination.area && request.destination.city && request.budget.ideal <= request.budget.ceiling);
  const scope = useMemo(() => [request.home_size.replace(/_/g, " "), request.services?.packing ? "packing" : "no packing", request.services?.insurance ? "insured" : "no insurance"].join(" · "), [request]);

  function updateAddress(kind: "origin" | "destination", key: "area" | "city", value: string) {
    setRequest((current) => ({ ...current, [kind]: { ...current[kind], [key]: value } }));
  }
  async function confirm() {
    setStatus("Saving the confirmed moving brief…");
    try {
      const created = await fetch("/api/orchestrator/requirements", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ spec: request, source_path: "moving_form" }) });
      const record = await created.json(); if (!created.ok) throw new Error(record.error ?? "Could not save request.");
      const confirmed = await fetch(`/api/orchestrator/requirements/${record.id}/confirm`, { method: "POST" });
      const result = await confirmed.json(); if (!confirmed.ok) throw new Error(result.error ?? "Could not confirm request.");
      localStorage.setItem("scout_requirement_id", result.id);
      localStorage.setItem("scout_moving_requirement_id", result.id);
      setStatus("Confirmed. Your brief is locked for discovery and negotiation.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not confirm moving request."); }
  }

  return <div className="space-y-6">
    <header className="max-w-2xl"><p className="mono text-[11px] uppercase tracking-[0.18em] text-rust">Moving pilot · confirmed request</p><h1 className="mt-2 text-4xl">Plan the move once.</h1><p className="mt-2 text-sm leading-relaxed text-charcoal/70">Scout carries this exact scope into every company conversation. It can ask, compare, and negotiate; it never books or pays.</p></header>
    <VoiceIntakePanel onConfirmed={setStatus} />
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="card space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2"><Address label="Move from" value={request.origin} onChange={(key, value) => updateAddress("origin", key, value)} /><Address label="Move to" value={request.destination} onChange={(key, value) => updateAddress("destination", key, value)} /></div>
        <div className="grid gap-4 sm:grid-cols-3"><Field label="Move date"><input type="date" value={request.move_date} onChange={(event) => setRequest((current) => ({ ...current, move_date: event.target.value }))} className={INPUT} /></Field><Field label="Home size"><select value={request.home_size} onChange={(event) => setRequest((current) => ({ ...current, home_size: event.target.value as MovingRequest["home_size"] }))} className={INPUT}>{["studio", "1_bed", "2_bed", "3_bed_plus", "custom"].map((size) => <option key={size} value={size}>{size.replace(/_/g, " ")}</option>)}</select></Field><Field label="Negotiation"><select value={request.negotiation_posture} onChange={(event) => setRequest((current) => ({ ...current, negotiation_posture: event.target.value as MovingRequest["negotiation_posture"] }))} className={INPUT}>{["fast", "balanced", "aggressive"].map((posture) => <option key={posture}>{posture}</option>)}</select></Field></div>
        <Field label="Inventory / special items"><textarea value={request.inventory_notes} onChange={(event) => setRequest((current) => ({ ...current, inventory_notes: event.target.value }))} className={`${INPUT} h-24 resize-none`} placeholder="e.g. sofa, mattress, desk, 12 boxes, fragile TV" /></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Ideal total"><input type="number" value={request.budget.ideal} onChange={(event) => setRequest((current) => ({ ...current, budget: { ...current.budget, ideal: Number(event.target.value) } }))} className={INPUT} /></Field><Field label="Hard ceiling"><input type="number" value={request.budget.ceiling} onChange={(event) => setRequest((current) => ({ ...current, budget: { ...current.budget, ceiling: Number(event.target.value) } }))} className={INPUT} /></Field></div>
      </section>
      <aside className="space-y-4"><div className="card p-5"><p className="mono text-[11px] uppercase tracking-wide text-charcoal/55">Negotiation brief</p><h2 className="mt-2 text-xl">{request.origin.area || "Origin"} → {request.destination.area || "Destination"}</h2><p className="mt-3 text-sm text-charcoal/70">{scope}</p><div className="wire my-4" /><p className="mono text-xs text-charcoal/65">TARGET {request.budget.currency} {request.budget.ideal}<br />CEILING {request.budget.currency} {request.budget.ceiling}</p></div><button onClick={confirm} disabled={!ready} className="btn w-full justify-center">CONFIRM MOVING BRIEF →</button><a href="/discover" className="btn-ghost block text-center">DISCOVER MOVERS →</a>{status && <p className="mono text-[11px] text-charcoal/65">{status}</p>}</aside>
    </div>
  </div>;
}

function Address({ label, value, onChange }: { label: string; value: { area: string; city: string }; onChange: (key: "area" | "city", value: string) => void }) { return <div className="space-y-2"><p className="mono text-[11px] uppercase tracking-wide text-charcoal/55">{label}</p><input className={INPUT} value={value.area} onChange={(event) => onChange("area", event.target.value)} placeholder="Area / locality" /><input className={INPUT} value={value.city} onChange={(event) => onChange("city", event.target.value)} placeholder="City" /></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mono mb-1 block text-[11px] uppercase tracking-wide text-charcoal/55">{label}</span>{children}</label>; }
