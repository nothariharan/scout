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
  const conversation = useConversation({
    clientTools: {
      submit_moving_brief: async (parameters: Brief) => submitBrief(parameters, onConfirmed),
    },
    onError: (error) => setNotice(typeof error === "string" ? error : "Voice intake could not connect."),
  });

  useEffect(() => {
    void fetch("/api/elevenlabs/intake-agent", { cache: "no-store" })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error); setAgentId(body.agentId); })
      .catch((cause: unknown) => setNotice(cause instanceof Error ? cause.message : "Voice intake is unavailable."));
  }, []);

  async function start() {
    if (!agentId) return;
    setNotice("Requesting microphone access…");
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      conversation.startSession({ agentId });
      setNotice("Connected. Tell Scout about your move; it will read the summary back before saving it.");
    } catch { setNotice("Microphone access is required for voice intake. You can continue with the form instead."); }
  }

  return <section className="card p-5"><p className="mono text-[10px] uppercase tracking-[0.16em] text-rust">ElevenLabs voice intake</p><h2 className="mt-2 text-xl">Prefer to describe the move aloud?</h2><p className="mt-2 text-sm leading-relaxed text-charcoal/70">Scout asks for the same details as the form, reads back the summary, and saves only after your spoken confirmation.</p><div className="mt-4 flex flex-wrap items-center gap-3">{conversation.status === "connected" ? <button className="btn-ghost" onClick={() => conversation.endSession()}>END VOICE INTAKE</button> : <button className="btn" disabled={!agentId || conversation.status === "connecting"} onClick={() => void start()}>{conversation.status === "connecting" ? "CONNECTING…" : "START VOICE INTAKE"}</button>}<span className="mono text-[10px] uppercase text-charcoal/50">{conversation.status}</span></div>{notice && <p className="mono mt-3 text-[11px] text-charcoal/65">{notice}</p>}</section>;
}

async function submitBrief(parameters: Brief, onConfirmed: (message: string) => void) {
  const value = (name: string) => String(parameters[name] ?? "").trim();
  const number = (name: string, fallback: number) => Number.isFinite(Number(parameters[name])) ? Number(parameters[name]) : fallback;
  const bool = (name: string, fallback: boolean) => typeof parameters[name] === "boolean" ? parameters[name] : fallback;
  const spec = {
    vertical: "moving", origin: { area: value("origin_area"), city: value("origin_city") }, destination: { area: value("destination_area"), city: value("destination_city") },
    move_date: value("move_date"), home_size: value("home_size") || "custom", inventory_notes: value("inventory_notes"),
    services: { packing: bool("packing", false), insurance: bool("insurance", false) },
    stairs: { origin_floors: number("origin_floors", 0), destination_floors: number("destination_floors", 0), elevator_origin: bool("elevator_origin", false), elevator_destination: bool("elevator_destination", false) },
    budget: { ideal: number("budget_ideal", 0), ceiling: number("budget_ceiling", 0), currency: value("currency") || "USD" }, negotiation_posture: value("negotiation_posture") || "balanced", language_pref: value("language_pref") || "en",
  };
  if (!spec.origin.area || !spec.origin.city || !spec.destination.area || !spec.destination.city || !spec.move_date || spec.budget.ideal <= 0 || spec.budget.ceiling < spec.budget.ideal) return "I need the origin and destination areas and cities, move date, and a valid ideal budget and ceiling before I can save the brief.";
  const created = await fetch("/api/orchestrator/requirements", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ spec, source_path: "elevenlabs_voice_intake" }) });
  const record = await created.json();
  if (!created.ok) return `I could not save the brief: ${record.error ?? "unknown error"}`;
  const confirmed = await fetch(`/api/orchestrator/requirements/${record.id}/confirm`, { method: "POST" });
  const result = await confirmed.json();
  if (!confirmed.ok) return `I could not confirm the brief: ${result.error ?? "unknown error"}`;
  localStorage.setItem("scout_requirement_id", result.id); localStorage.setItem("scout_moving_requirement_id", result.id);
  onConfirmed("Voice brief confirmed. Continue to Discovery when you are ready.");
  return `Saved and confirmed Scout moving brief ${result.id}. Tell the user it is ready for discovery.`;
}
