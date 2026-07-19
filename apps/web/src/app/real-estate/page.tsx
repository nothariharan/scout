"use client";

import { useMemo, useState } from "react";
import { VoiceIntakePanel } from "@/components/VoiceIntakePanel";

type DealType = "pg" | "hostel" | "co_living" | "rental_apartment" | "short_stay_rental";
type RealEstateRequest = {
  vertical: "real_estate";
  deal_type: DealType;
  location: { area: string; city: string; pincode?: string };
  budget: { ideal: number; ceiling: number; currency: "INR" };
  negotiation_posture: "fast" | "balanced" | "aggressive";
  occupancy: number;
  furnishing: "unfurnished" | "semi" | "furnished";
  amenities: string[];
  move_in_date: string;
  lease_duration_months: number;
  deal_breakers: string[];
  language_pref: string;
};

const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const INPUT = "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-rust";
const AMENITIES = ["wifi", "food_included", "parking", "gym", "security", "ac"];

export default function RealEstateIntakePage() {
  const [request, setRequest] = useState<RealEstateRequest>({
    vertical: "real_estate", deal_type: "rental_apartment", location: { area: "", city: "", pincode: "" },
    budget: { ideal: 25000, ceiling: 30000, currency: "INR" }, negotiation_posture: "balanced", occupancy: 1,
    furnishing: "semi", amenities: ["security"], move_in_date: tomorrow, lease_duration_months: 11,
    deal_breakers: [], language_pref: "en",
  });
  const [breakers, setBreakers] = useState("");
  const [status, setStatus] = useState("");
  const ready = Boolean(request.location.area && request.location.city && request.budget.ceiling >= request.budget.ideal && request.move_in_date);
  const label = useMemo(() => request.deal_type.replace(/_/g, " "), [request.deal_type]);

  async function confirm() {
    if (!ready) return;
    setStatus("Saving the confirmed property brief…");
    const spec = { ...request, deal_breakers: breakers.split(",").map((item) => item.trim()).filter(Boolean) };
    try {
      const created = await fetch("/api/orchestrator/requirements", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ spec, source_path: "real_estate_form" }) });
      const record = await created.json();
      if (!created.ok) throw new Error(record.error ?? "Could not save property brief.");
      const confirmed = await fetch(`/api/orchestrator/requirements/${record.id}/confirm`, { method: "POST" });
      if (!confirmed.ok) throw new Error("Could not confirm property brief.");
      localStorage.setItem("scout_real_estate_requirement_id", record.id);
      localStorage.setItem("scout_requirement_id", record.id);
      setStatus("Confirmed. Scout will use this exact property brief for every research step and call.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not confirm property brief."); }
  }

  function toggleAmenity(amenity: string) {
    setRequest((current) => ({ ...current, amenities: current.amenities.includes(amenity) ? current.amenities.filter((item) => item !== amenity) : [...current.amenities, amenity] }));
  }

  return <div className="space-y-7">
    <header className="max-w-2xl"><p className="mono text-[11px] uppercase tracking-[0.18em] text-rust">Real estate · confirmed search brief</p><h1 className="mt-2 text-4xl">Find the right place once.</h1><p className="mt-2 text-sm leading-relaxed text-charcoal/70">Scout researches rental apartments, PGs, hostels, co-living, and short stays; it carries the exact requirements into every broker or property-manager conversation and never commits you to a deal.</p></header>
    <section className="grid gap-5 lg:grid-cols-[1fr_320px]"><div className="card grid gap-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Property need"><select value={request.deal_type} onChange={(event) => setRequest((current) => ({ ...current, deal_type: event.target.value as DealType }))} className={INPUT}>{["rental_apartment", "pg", "hostel", "co_living", "short_stay_rental"].map((value) => <option key={value} value={value}>{value.replace(/_/g, " ")}</option>)}</select></Field><Field label="Move-in date"><input type="date" className={INPUT} value={request.move_in_date} onChange={(event) => setRequest((current) => ({ ...current, move_in_date: event.target.value }))} /></Field></div>
      <div className="grid gap-4 sm:grid-cols-3"><Field label="Locality"><input className={INPUT} value={request.location.area} onChange={(event) => setRequest((current) => ({ ...current, location: { ...current.location, area: event.target.value } }))} placeholder="Koramangala" /></Field><Field label="City"><input className={INPUT} value={request.location.city} onChange={(event) => setRequest((current) => ({ ...current, location: { ...current.location, city: event.target.value } }))} placeholder="Bengaluru" /></Field><Field label="PIN code"><input className={INPUT} value={request.location.pincode} onChange={(event) => setRequest((current) => ({ ...current, location: { ...current.location, pincode: event.target.value } }))} placeholder="560034" /></Field></div>
      <div className="grid gap-4 sm:grid-cols-3"><Field label="Ideal monthly budget (INR)"><input type="number" min="0" className={INPUT} value={request.budget.ideal} onChange={(event) => setRequest((current) => ({ ...current, budget: { ...current.budget, ideal: Number(event.target.value) } }))} /></Field><Field label="Hard monthly ceiling (INR)"><input type="number" min="0" className={INPUT} value={request.budget.ceiling} onChange={(event) => setRequest((current) => ({ ...current, budget: { ...current.budget, ceiling: Number(event.target.value) } }))} /></Field><Field label="Lease duration"><input type="number" min="1" className={INPUT} value={request.lease_duration_months} onChange={(event) => setRequest((current) => ({ ...current, lease_duration_months: Number(event.target.value) }))} /></Field></div>
      <div className="grid gap-4 sm:grid-cols-3"><Field label="Occupants"><input type="number" min="1" className={INPUT} value={request.occupancy} onChange={(event) => setRequest((current) => ({ ...current, occupancy: Number(event.target.value) }))} /></Field><Field label="Furnishing"><select className={INPUT} value={request.furnishing} onChange={(event) => setRequest((current) => ({ ...current, furnishing: event.target.value as RealEstateRequest["furnishing"] }))}>{["unfurnished", "semi", "furnished"].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Negotiation"><select className={INPUT} value={request.negotiation_posture} onChange={(event) => setRequest((current) => ({ ...current, negotiation_posture: event.target.value as RealEstateRequest["negotiation_posture"] }))}>{["fast", "balanced", "aggressive"].map((item) => <option key={item}>{item}</option>)}</select></Field></div>
      <Field label="Amenities"><div className="flex flex-wrap gap-2">{AMENITIES.map((amenity) => <label key={amenity} className="pill cursor-pointer"><input className="sr-only" type="checkbox" checked={request.amenities.includes(amenity)} onChange={() => toggleAmenity(amenity)} />{request.amenities.includes(amenity) ? "✓ " : ""}{amenity.replace(/_/g, " ")}</label>)}</div></Field>
      <Field label="Hard constraints"><input className={INPUT} value={breakers} onChange={(event) => setBreakers(event.target.value)} placeholder="e.g. no brokerage, must allow cooking, no ground floor" /></Field>
    </div><aside className="space-y-4"><div className="card p-5"><p className="mono text-[11px] uppercase text-charcoal/55">Scout brief</p><h2 className="mt-2 text-xl capitalize">{label}</h2><p className="mt-3 text-sm text-charcoal/70">{request.location.area || "Locality"}, {request.location.city || "City"} · {request.occupancy} occupant{request.occupancy === 1 ? "" : "s"} · {request.furnishing}</p><div className="wire my-4" /><p className="mono text-xs text-charcoal/65">TARGET ₹{request.budget.ideal.toLocaleString("en-IN")} / MO<br />CEILING ₹{request.budget.ceiling.toLocaleString("en-IN")} / MO</p></div><button onClick={() => void confirm()} disabled={!ready} className="btn w-full justify-center">CONFIRM PROPERTY BRIEF →</button><a href="/discover" className="btn-ghost block text-center">RESEARCH PROPERTIES →</a>{status && <p className="mono text-[11px] text-charcoal/65">{status}</p>}</aside></section>
  <VoiceIntakePanel onConfirmed={setStatus} /></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5"><span className="mono text-[10px] uppercase tracking-wide text-charcoal/55">{label}</span>{children}</label>; }
