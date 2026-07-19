"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Building2, CheckCircle2, MapPin, Mic, PhoneCall, Search, ShieldCheck } from "lucide-react";
import { VoiceIntakePanel } from "@/components/VoiceIntakePanel";

type IntakeMode = "voice" | "write";
type DealType = "hostel" | "pg" | "co_living" | "rental_apartment" | "short_stay_rental";
type Candidate = { listing_id: string; listing_name: string; phone?: string; address?: string; distance_km?: number };

const INPUT =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-[#0a84ff] focus:ring-4 focus:ring-blue-500/10";

const TOMORROW = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

export default function RealEstateIntakePage() {
  const [mode, setMode] = useState<IntakeMode>("voice");
  const [dealType, setDealType] = useState<DealType>("hostel");
  const [area, setArea] = useState("Koramangala 5th Block");
  const [city, setCity] = useState("Bengaluru");
  const [moveIn, setMoveIn] = useState(TOMORROW);
  const [duration, setDuration] = useState("1");
  const [occupancy, setOccupancy] = useState("1");
  const [budget, setBudget] = useState("15000");
  const [amenities, setAmenities] = useState("Food, Wi-Fi, security");
  const [constraints, setConstraints] = useState("No token before visit. Need a written breakdown of every charge.");
  const [language, setLanguage] = useState<"hi" | "en">("hi");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [requirementId, setRequirementId] = useState<string | null>(null);

  const ready = Boolean(area.trim() && city.trim() && moveIn && Number(budget) > 0 && Number(duration) > 0);
  const outcome = useMemo(
    () => `Find a ${dealType.replace(/_/g, " ")} near ${area || "the chosen locality"} and negotiate an all-inclusive stay within the approved ceiling.`,
    [area, dealType],
  );

  async function saveWrittenBrief() {
    if (!ready || saving) return;
    setSaving(true);
    setStatus("Confirming your property brief…");
    const amount = Number(budget);
    const spec = {
      vertical: "real_estate",
      deal_type: dealType,
      location: { area: area.trim(), city: city.trim() },
      budget: { ideal: amount, ceiling: amount, currency: "INR" },
      negotiation_posture: "balanced",
      occupancy: Number(occupancy) || 1,
      furnishing: "semi",
      amenities: amenities.split(",").map((item) => item.trim()).filter(Boolean),
      move_in_date: moveIn,
      lease_duration_months: Number(duration),
      deal_breakers: constraints.split(/[\n.]/).map((item) => item.trim()).filter(Boolean),
      language_pref: language,
    };
    try {
      const created = await fetch("/api/orchestrator/requirements", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ spec, source_path: "property_written_intake" }),
      });
      const record = await created.json();
      if (!created.ok) throw new Error(record.error ?? "Scout could not save the property brief.");
      const confirmed = await fetch(`/api/orchestrator/requirements/${record.id}/confirm`, { method: "POST" });
      if (!confirmed.ok) throw new Error("Scout could not confirm the property brief.");
      localStorage.setItem("scout_requirement_id", record.id);
      localStorage.setItem("scout_real_estate_requirement_id", record.id);
      setRequirementId(record.id);
      setStatus("Property brief confirmed. Scout can now find matching local hostels and PGs.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Scout could not save the property brief.");
    } finally {
      setSaving(false);
    }
  }

  function handleVoiceConfirmed(message: string, id?: string) {
    setStatus(message);
    if (id) setRequirementId(id);
  }

  return (
    <div className="universal-intake property-intake">
      <header className="intake-heading">
        <p>SCOUT / PROPERTY SEARCH</p>
        <h1>Tell Scout where<br />you want to live.</h1>
        <span>
          A short, confirmed brief gives every hostel, PG, and property manager the same facts.
          Scout will never book or pay on your behalf.
        </span>
      </header>

      <section className="intake-mode-switch" aria-label="Choose intake method">
        <button type="button" data-active={mode === "voice"} onClick={() => setMode("voice")}><Mic size={17} /> Talk to Scout <small>Primary</small></button>
        <button type="button" data-active={mode === "write"} onClick={() => setMode("write")}><Building2 size={17} /> Write the brief <small>Alternative</small></button>
      </section>

      {mode === "voice" ? <VoiceIntakePanel onConfirmed={handleVoiceConfirmed} /> : (
        <section className="written-intake-shell">
          <form className="written-intake-form" onSubmit={(event) => { event.preventDefault(); void saveWrittenBrief(); }}>
            <div className="form-section-head"><div><p>CONFIRMED PROPERTY BRIEF</p><h2>The terms Scout takes into every call.</h2></div><span>Only confirmed details are shared with property managers.</span></div>
            <div className="task-choice-grid">
              {(["hostel", "pg", "co_living", "rental_apartment"] as DealType[]).map((option) => <button key={option} type="button" data-active={dealType === option} onClick={() => setDealType(option)}><strong>{option.replace(/_/g, " ")}</strong><span>{option === "hostel" ? "Short stay or student accommodation" : "Property option"}</span></button>)}
            </div>
            <div className="grid gap-4 sm:grid-cols-2"><label className="intake-field"><span>Locality</span><input className={INPUT} value={area} onChange={(event) => setArea(event.target.value)} /></label><label className="intake-field"><span>City</span><input className={INPUT} value={city} onChange={(event) => setCity(event.target.value)} /></label></div>
            <div className="grid gap-4 sm:grid-cols-3"><label className="intake-field"><span>Move-in date</span><input className={INPUT} type="date" value={moveIn} onChange={(event) => setMoveIn(event.target.value)} /></label><label className="intake-field"><span>Stay (months)</span><input className={INPUT} min="1" type="number" value={duration} onChange={(event) => setDuration(event.target.value)} /></label><label className="intake-field"><span>Occupants</span><input className={INPUT} min="1" type="number" value={occupancy} onChange={(event) => setOccupancy(event.target.value)} /></label></div>
            <div className="grid gap-4 sm:grid-cols-2"><label className="intake-field"><span>All-inclusive monthly ceiling (rupees)</span><input className={INPUT} min="1" type="number" value={budget} onChange={(event) => setBudget(event.target.value)} /></label><label className="intake-field"><span>Call language</span><select className={INPUT} value={language} onChange={(event) => setLanguage(event.target.value as "hi" | "en")}><option value="hi">Hindi first, then English if requested</option><option value="en">English</option></select></label></div>
            <label className="intake-field"><span>Must include <small>Comma-separated</small></span><input className={INPUT} value={amenities} onChange={(event) => setAmenities(event.target.value)} /></label>
            <label className="intake-field"><span>Hard limits and deal-breakers</span><textarea className={INPUT} rows={3} value={constraints} onChange={(event) => setConstraints(event.target.value)} /></label>
            <button type="submit" className="btn outcome-submit" disabled={!ready || saving}>{saving ? "Confirming…" : "Confirm property brief"} <ArrowRight size={16} /></button>
          </form>
          <aside className="outcome-preview"><p>SCOUT WILL</p><h2>Find and compare</h2><ol><li><Search size={17} /><span>Search public local-property sources around {area || "your locality"}</span></li><li><PhoneCall size={17} /><span>Prepare consistent, AI-disclosed negotiations</span></li><li><ShieldCheck size={17} /><span>Return itemised terms and evidence before you decide</span></li></ol><div className="preview-guardrail"><CheckCircle2 size={17} /><span>No booking, deposit, or payment commitment without you.</span></div></aside>
        </section>
      )}

      {status && <div className="intake-status voice-status" role="status">{status}</div>}
      {requirementId && <DispatchPreview requirementId={requirementId} area={area} city={city} />}
    </div>
  );
}

function DispatchPreview({ requirementId, area, city }: { requirementId: string; area: string; city: string }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [state, setState] = useState<"discovering" | "ready" | "error">("discovering");

  useEffect(() => {
    let active = true;
    void fetch(`/api/orchestrator/requirements/${requirementId}/discover`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ service_type: "hostel", radius_meters: 6000, limit: 3 }) })
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error); return result.candidates as Candidate[]; })
      .then((found) => { if (active) { setCandidates(found); setState("ready"); } })
      .catch(() => { if (active) setState("error"); });
    return () => { active = false; };
  }, [requirementId]);

  const cards = candidates.length ? candidates : [1, 2, 3].map((index) => ({ listing_id: `preview-${index}`, listing_name: `Local hostel candidate ${String(index).padStart(2, "0")}` }));
  return <section className="dispatch-preview" aria-live="polite"><div className="dispatch-preview-head"><div><p>SCOUT IS PREPARING THE NEXT STEP</p><h2>From your brief to nearby conversations.</h2><span>{state === "discovering" ? `Finding public hostel and PG listings near ${area}, ${city}…` : state === "ready" ? "Public candidates found. Review them before Scout calls anyone." : "Local discovery is ready to retry from Targets."}</span></div><a className="btn" href="/discover">Review targets <ArrowRight size={16} /></a></div><div className="dispatch-lane"><div className="dispatch-origin"><MapPin size={19} /><span>Confirmed</span><strong>{area}, {city}</strong></div><div className="dispatch-line" aria-hidden="true"><i /><i /><i /></div>{cards.map((candidate, index) => <article className="dispatch-target" key={candidate.listing_id} style={{ "--delay": `${index * 180}ms` } as React.CSSProperties}><span><PhoneCall size={15} /></span><div><small>AGENT {String(index + 1).padStart(2, "0")}</small><strong>{candidate.listing_name}</strong><em>{state === "ready" ? "Ready for review" : "Discovery queue"}</em></div></article>)}</div><p className="dispatch-footnote">Planning preview only — Scout does not call a business until you select it and explicitly start calls.</p></section>;
}
