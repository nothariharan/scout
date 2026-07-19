"use client";

import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { useEffect, useMemo, useState } from "react";

type DealType = "pg" | "hostel" | "co_living" | "rental_apartment" | "short_stay_rental";
type Answer = string | string[];
type InterviewState = {
  dealType: DealType;
  area: string;
  city: string;
  moveIn: string;
  duration: string;
  occupancy: string;
  budget: string;
  amenities: string[];
  constraints: string;
  language: "hi" | "en";
};

const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const seed: InterviewState = {
  dealType: "hostel", area: "Koramangala 5th Block", city: "Bengaluru", moveIn: tomorrow,
  duration: "1 week", occupancy: "1", budget: "15000", amenities: ["Wi-Fi", "Food", "Security"],
  constraints: "No token before visit. Written breakdown of every charge.", language: "hi",
};

const questions = [
  { key: "dealType", label: "THE TYPE OF STAY", ask: "What kind of place are we looking for?", options: ["Hostel", "PG", "Co-living", "Apartment"] },
  { key: "area", label: "WHERE", ask: "Which locality should Scout focus on?", options: ["Koramangala 5th Block", "HSR Layout", "Indiranagar"] },
  { key: "moveIn", label: "WHEN", ask: "When do you need to move in?", options: ["This week", "Next week", "Next month"] },
  { key: "duration", label: "HOW LONG", ask: "How long will you need the stay?", options: ["1 week", "1 month", "6 months", "11 months"] },
  { key: "budget", label: "THE CEILING", ask: "What is the highest all-in amount Scout may negotiate to?", options: ["₹15,000", "₹20,000", "₹25,000"] },
  { key: "amenities", label: "NON-NEGOTIABLES", ask: "What needs to be included?", options: ["Wi-Fi", "Food", "Security", "AC"] },
] as const;

const transcriptFor = (state: InterviewState, step: number) => {
  const turns = [
    ["scout", "Namaste — I’m Scout. I’ll get the facts once, then negotiate on exactly those terms."],
    ["scout", questions[step]?.ask ?? "I have what I need. Let me read the brief back before I lock it."],
  ] as ["scout" | "you", string][];
  if (step > 0) turns.splice(1, 0, ["you", String(answerFor(state, questions[step - 1].key))]);
  return turns;
};

function answerFor(state: InterviewState, key: (typeof questions)[number]["key"]) {
  const values: Record<string, Answer> = {
    dealType: state.dealType === "hostel" ? "A hostel, please." : state.dealType,
    area: `${state.area}, ${state.city}.`, moveIn: state.moveIn, duration: state.duration,
    budget: `₹${Number(state.budget || 0).toLocaleString("en-IN")} all-in.`, amenities: state.amenities,
  };
  const value = values[key];
  return Array.isArray(value) ? value.join(", ") : value;
}

export function ScoutInterview() {
  return <ConversationProvider><Interview /></ConversationProvider>;
}

function Interview() {
  const [state, setState] = useState(seed);
  const [step, setStep] = useState(0);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [voiceNotice, setVoiceNotice] = useState("Scout is ready to listen.");
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const conversation = useConversation({
    clientTools: { submit_real_estate_brief: async (brief: Record<string, unknown>) => saveVoiceBrief(brief, setLocked, setVoiceNotice) },
    onError: () => setVoiceNotice("Voice link unavailable. Keep the interview moving with the answer chips below."),
  });

  useEffect(() => {
    void fetch("/api/elevenlabs/intake-agent", { cache: "no-store" })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(); setAgentId(body.agentId); })
      .catch(() => setVoiceNotice("Demo mode is ready — use the interview controls below."));
  }, []);

  const complete = step >= questions.length;
  const turns = useMemo(() => transcriptFor(state, Math.min(step, questions.length - 1)), [state, step]);
  const active = questions[Math.min(step, questions.length - 1)];

  async function beginVoice() {
    if (!agentId) return;
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({ agentId });
      setVoiceNotice("Live with Scout. Speak naturally; it will confirm the brief before saving.");
    } catch { setVoiceNotice("Microphone permission was blocked. Use the interview controls for this take."); }
  }

  function choose(value: string) {
    if (!active || complete) return;
    if (active.key === "amenities") {
      setState((current) => ({ ...current, amenities: current.amenities.includes(value) ? current.amenities.filter((item) => item !== value) : [...current.amenities, value] }));
      return;
    }
    if (active.key === "dealType") {
      const mapping: Record<string, DealType> = { Hostel: "hostel", PG: "pg", "Co-living": "co_living", Apartment: "rental_apartment" };
      setState((current) => ({ ...current, dealType: mapping[value] }));
    } else if (active.key === "area") setState((current) => ({ ...current, area: value }));
    else if (active.key === "moveIn") setState((current) => ({ ...current, moveIn: value === "This week" ? tomorrow : value }));
    else if (active.key === "duration") setState((current) => ({ ...current, duration: value }));
    else if (active.key === "budget") setState((current) => ({ ...current, budget: value.replace(/[^0-9]/g, "") }));
  }

  async function lockBrief() {
    setSaving(true);
    const months = state.duration.includes("11") ? 11 : state.duration.includes("6") ? 6 : 1;
    const amount = Number(state.budget) || 15000;
    const spec = {
      vertical: "real_estate", deal_type: state.dealType,
      location: { area: state.area, city: state.city }, budget: { ideal: amount, ceiling: amount, currency: "INR" },
      negotiation_posture: "balanced", occupancy: Number(state.occupancy) || 1, furnishing: "semi",
      amenities: state.amenities.map((item) => item.toLowerCase().replace("-", "_")).concat("security"),
      move_in_date: state.moveIn === "This week" ? tomorrow : state.moveIn, lease_duration_months: months,
      deal_breakers: state.constraints.split(".").map((item) => item.trim()).filter(Boolean), language_pref: state.language,
    };
    try {
      const created = await fetch("/api/orchestrator/requirements", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ spec, source_path: "scout_interview" }) });
      const record = await created.json(); if (!created.ok) throw new Error(record.error);
      const confirmed = await fetch(`/api/orchestrator/requirements/${record.id}/confirm`, { method: "POST" });
      if (!confirmed.ok) throw new Error("Scout could not lock the brief.");
      localStorage.setItem("scout_requirement_id", record.id); localStorage.setItem("scout_real_estate_requirement_id", record.id);
      setLocked(record.id); setVoiceNotice("Brief locked. Every Scout call will use these exact terms.");
    } catch (error) { setVoiceNotice(error instanceof Error ? error.message : "Scout could not save the brief."); }
    finally { setSaving(false); }
  }

  return <div className="interview-shell">
    <section className="interview-hero">
      <div className="interview-copy"><p className="mono text-[11px] uppercase tracking-[0.22em] text-rust">01 / Scout intake interview</p><h1>Tell Scout what<br /><em>home</em> needs to feel like.</h1><p>Not a form. A short, focused conversation that gives Scout the facts it needs to negotiate without improvising.</p></div>
      <div className="interview-status"><span className={conversation.status === "connected" ? "pulse live-dot" : "live-dot"} /><div><span className="mono text-[10px] uppercase tracking-[0.14em]">Scout intake agent</span><strong>{conversation.status === "connected" ? "Listening now" : "Ready for interview"}</strong></div>{conversation.status === "connected" ? <button className="interview-quiet" onClick={() => conversation.endSession()}>End voice</button> : <button className="interview-voice" disabled={!agentId} onClick={() => void beginVoice()}><span>●</span> Talk to Scout</button>}</div>
    </section>

    <section className="interview-grid">
      <div className="interview-dialogue">
        <div className="dialogue-top"><span className="mono">LIVE BRIEF / {String(Math.min(step + 1, questions.length)).padStart(2, "0")}</span><span>{complete ? "Reviewing facts" : active.label}</span></div>
        <div className="dialogue-scroll">{turns.map(([speaker, text], index) => <div key={`${speaker}-${index}`} className={`bubble ${speaker}`}><span>{speaker === "scout" ? "SCOUT" : "YOU"}</span><p>{text}</p></div>)}</div>
        {!complete ? <div className="interview-question"><p className="mono">{active.label}</p><h2>{active.ask}</h2><div className="answer-grid">{active.options.map((option) => { const checked = active.key === "amenities" ? state.amenities.includes(option) : String(answerFor(state, active.key)).toLowerCase().includes(option.toLowerCase().replace("₹", "")); return <button key={option} className={checked ? "answer active" : "answer"} onClick={() => choose(option)}>{active.key === "amenities" && <i>{checked ? "✓" : "+"}</i>}{option}</button>; })}</div><div className="interview-controls"><button className="interview-quiet" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>Back</button><button className="interview-next" onClick={() => setStep((current) => current + 1)}>{step === questions.length - 1 ? "Read back my brief" : "Continue"} <span>→</span></button></div></div> : <div className="interview-question confirm"><p className="mono">SCOUT’S READ-BACK</p><h2>Here’s what I’ll carry into every call.</h2><p className="readback">{state.dealType.replace("_", " ")} near <b>{state.area}, {state.city}</b> · {state.duration} · up to <b>₹{Number(state.budget).toLocaleString("en-IN")}</b> · {state.amenities.join(", ")}</p><div className="interview-controls"><button className="interview-quiet" onClick={() => setStep(questions.length - 1)}>Edit answers</button><button className="interview-next" disabled={saving || Boolean(locked)} onClick={() => void lockBrief()}>{locked ? "Brief locked ✓" : saving ? "Locking…" : "Confirm this brief"} <span>→</span></button></div></div>}
      </div>
      <aside className="brief-rail"><div className="rail-cap"><span className="mono">SCOUT MEMORY</span><span>{locked ? "LOCKED" : "DRAFT"}</span></div><div className="rail-item"><small>STAY</small><strong>{state.dealType.replace("_", " ")}</strong></div><div className="rail-item"><small>PLACE</small><strong>{state.area}<br />{state.city}</strong></div><div className="rail-item"><small>CEILING</small><strong>₹{Number(state.budget).toLocaleString("en-IN")}</strong><em>all-in</em></div><div className="rail-item"><small>ASK FOR</small><div className="rail-tags">{state.amenities.map((item) => <span key={item}>{item}</span>)}</div></div><div className="rail-item"><small>RED LINES</small><p>{state.constraints}</p></div><button className="review-link" onClick={() => setReviewOpen((value) => !value)}>{reviewOpen ? "Hide detail" : "Review detail"} <span>↗</span></button>{reviewOpen && <div className="review-detail"><label>Locality<input value={state.area} onChange={(event) => setState((current) => ({ ...current, area: event.target.value }))} /></label><label>City<input value={state.city} onChange={(event) => setState((current) => ({ ...current, city: event.target.value }))} /></label><label>Constraints<textarea value={state.constraints} onChange={(event) => setState((current) => ({ ...current, constraints: event.target.value }))} /></label></div>}</aside>
    </section>
    <p className="interview-notice">{voiceNotice} {locked && <a href="/discover">Continue to property research →</a>}</p>
  </div>;
}

async function saveVoiceBrief(parameters: Record<string, unknown>, setLocked: (id: string) => void, setNotice: (message: string) => void) {
  const value = (key: string) => String(parameters[key] ?? "").trim();
  const number = (key: string) => Number(parameters[key]);
  const spec = { vertical: "real_estate", deal_type: value("deal_type") || "hostel", location: { area: value("area"), city: value("city"), pincode: value("pincode") }, budget: { ideal: number("budget_ideal"), ceiling: number("budget_ceiling"), currency: value("currency") || "INR" }, negotiation_posture: value("negotiation_posture") || "balanced", occupancy: number("occupancy") || 1, furnishing: value("furnishing") || "semi", amenities: Array.isArray(parameters.amenities) ? parameters.amenities.map(String) : [], move_in_date: value("move_in_date"), lease_duration_months: number("lease_duration_months") || 1, deal_breakers: Array.isArray(parameters.deal_breakers) ? parameters.deal_breakers.map(String) : [], language_pref: value("language_pref") || "hi" };
  if (!spec.location.area || !spec.location.city || !spec.move_in_date || !Number.isFinite(spec.budget.ideal) || spec.budget.ideal <= 0) return "I still need a locality, city, move-in date, and budget before I can lock the brief.";
  const created = await fetch("/api/orchestrator/requirements", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ spec, source_path: "elevenlabs_voice_interview" }) }); const record = await created.json();
  if (!created.ok) return `I could not save the brief: ${record.error ?? "unknown error"}`;
  const confirmed = await fetch(`/api/orchestrator/requirements/${record.id}/confirm`, { method: "POST" }); if (!confirmed.ok) return "I could not confirm the brief.";
  localStorage.setItem("scout_requirement_id", record.id); localStorage.setItem("scout_real_estate_requirement_id", record.id); setLocked(record.id); setNotice("Voice brief locked. Scout will use these exact terms in every call.");
  return "The brief is confirmed. Tell the user Scout is ready to research.";
}
