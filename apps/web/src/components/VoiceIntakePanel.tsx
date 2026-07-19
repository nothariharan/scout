"use client";

import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { useEffect, useState } from "react";

type Brief = Record<string, unknown>;

export function VoiceIntakePanel({ onConfirmed }: { onConfirmed: (message: string) => void }) {
  return <ConversationProvider><VoiceIntake onConfirmed={onConfirmed} /></ConversationProvider>;
}

function VoiceIntake({ onConfirmed }: { onConfirmed: (message: string) => void }) {
  const [agentId, setAgentId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const conversation = useConversation({
    clientTools: { submit_real_estate_brief: async (parameters: Brief) => submitBrief(parameters, onConfirmed) },
    onError: (error) => setNotice(typeof error === "string" ? error : "Voice intake could not connect."),
  });

  useEffect(() => { void fetch("/api/elevenlabs/intake-agent", { cache: "no-store" }).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error); setAgentId(body.agentId); }).catch((cause: unknown) => setNotice(cause instanceof Error ? cause.message : "Voice intake is unavailable.")); }, []);

  async function start() { if (!agentId) return; setNotice("Requesting microphone access…"); try { await navigator.mediaDevices.getUserMedia({ audio: true }); conversation.startSession({ agentId }); setNotice("Connected. Tell Scout about the property you need; it will read the summary back before saving it."); } catch { setNotice("Microphone access is required for voice intake. You can continue with the form instead."); } }
  async function uploadDocument(event: React.ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; setUploading(true); try { await conversation.uploadFile(file); setNotice(`${file.name} was sent to Scout. Ask it to extract the property details, then confirm the spoken summary before it saves.`); } catch { setNotice("Scout could not read that file. Try a clear image, PDF, or enter the details in the form."); } finally { setUploading(false); event.target.value = ""; } }

  return <section className="card p-5"><p className="mono text-[10px] uppercase tracking-[0.16em] text-rust">ElevenLabs voice or document intake</p><h2 className="mt-2 text-xl">Describe the place you need—or give Scout a document.</h2><p className="mt-2 text-sm leading-relaxed text-charcoal/70">Scout can extract a rental listing, broker message, or property document, asks only for missing details, reads the summary back, and saves only after your spoken confirmation.</p><div className="mt-4 flex flex-wrap items-center gap-3">{conversation.status === "connected" ? <><button className="btn-ghost" onClick={() => conversation.endSession()}>END INTAKE</button><label className="btn-ghost cursor-pointer">{uploading ? "UPLOADING…" : "ADD DOCUMENT"}<input className="sr-only" type="file" accept="application/pdf,image/*,.txt" disabled={uploading} onChange={(event) => void uploadDocument(event)} /></label></> : <button className="btn" disabled={!agentId || conversation.status === "connecting"} onClick={() => void start()}>{conversation.status === "connecting" ? "CONNECTING…" : "START INTAKE"}</button>}<span className="mono text-[10px] uppercase text-charcoal/50">{conversation.status}</span></div>{notice && <p className="mono mt-3 text-[11px] text-charcoal/65">{notice}</p>}</section>;
}

async function submitBrief(parameters: Brief, onConfirmed: (message: string) => void) {
  const value = (name: string) => String(parameters[name] ?? "").trim();
  const number = (name: string, fallback: number) => Number.isFinite(Number(parameters[name])) ? Number(parameters[name]) : fallback;
  const spec = { vertical: "real_estate", deal_type: value("deal_type") || "rental_apartment", location: { area: value("area"), city: value("city"), pincode: value("pincode") }, budget: { ideal: number("budget_ideal", 0), ceiling: number("budget_ceiling", 0), currency: value("currency") || "INR" }, negotiation_posture: value("negotiation_posture") || "balanced", occupancy: number("occupancy", 1), furnishing: value("furnishing") || "semi", amenities: Array.isArray(parameters.amenities) ? parameters.amenities.map(String) : [], move_in_date: value("move_in_date"), lease_duration_months: number("lease_duration_months", 11), deal_breakers: Array.isArray(parameters.deal_breakers) ? parameters.deal_breakers.map(String) : [], language_pref: value("language_pref") || "en" };
  if (!spec.location.area || !spec.location.city || !spec.move_in_date || spec.budget.ideal <= 0 || spec.budget.ceiling < spec.budget.ideal) return "I need the locality and city, move-in date, and a valid ideal budget and ceiling before I can save the brief.";
  const created = await fetch("/api/orchestrator/requirements", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ spec, source_path: "elevenlabs_voice_intake" }) });
  const record = await created.json(); if (!created.ok) return `I could not save the brief: ${record.error ?? "unknown error"}`;
  const confirmed = await fetch(`/api/orchestrator/requirements/${record.id}/confirm`, { method: "POST" }); const result = await confirmed.json(); if (!confirmed.ok) return `I could not confirm the brief: ${result.error ?? "unknown error"}`;
  localStorage.setItem("scout_requirement_id", result.id); localStorage.setItem("scout_real_estate_requirement_id", result.id); onConfirmed("Voice brief confirmed. Continue to Property Research when you are ready."); return `Saved and confirmed Scout real-estate brief ${result.id}. Tell the user it is ready for property research.`;
}
