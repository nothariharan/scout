"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  MessageSquareText,
  Mic,
  PhoneCall,
  Target,
} from "lucide-react";
import { VoiceIntakePanel } from "@/components/VoiceIntakePanel";

type IntakeMode = "voice" | "write";
type TaskType = "property_stay" | "vendor_service" | "client_outreach" | "custom";

const TASKS: Array<{ value: TaskType; label: string; example: string }> = [
  { value: "custom", label: "Any outbound task", example: "Give Scout a goal, targets, questions, and clear limits." },
  { value: "property_stay", label: "Property or stay", example: "Find and negotiate a PG, rental, short stay, or property." },
  { value: "vendor_service", label: "Vendor or service", example: "Compare providers, confirm availability, and negotiate quotes." },
  { value: "client_outreach", label: "Client outreach", example: "Follow up with prospects and confirm proposed deal terms." },
];

const INPUT =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-[#0a84ff] focus:ring-4 focus:ring-blue-500/10";

export default function OutcomeIntakePage() {
  const [mode, setMode] = useState<IntakeMode>("voice");
  const [taskType, setTaskType] = useState<TaskType>("custom");
  const [outcome, setOutcome] = useState("");
  const [market, setMarket] = useState("");
  const [city, setCity] = useState("");
  const [targets, setTargets] = useState("");
  const [idealBudget, setIdealBudget] = useState("");
  const [ceiling, setCeiling] = useState("");
  const [questions, setQuestions] = useState("");
  const [constraints, setConstraints] = useState("");
  const [authority, setAuthority] = useState<"confirm_only" | "negotiate" | "provisional_agreement">("negotiate");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedTask = useMemo(
    () => TASKS.find((task) => task.value === taskType) ?? TASKS[0],
    [taskType],
  );
  const ready = Boolean(outcome.trim() && (market.trim() || targets.trim()));

  async function confirmWrittenOutcome() {
    if (!ready || saving) return;
    setSaving(true);
    setStatus("Saving your confirmed outcome...");

    const targetLines = targets
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const spec = {
      vertical: "outbound",
      deal_type: taskType,
      task_type: taskType,
      outcome: outcome.trim(),
      location: {
        area: market.trim() || "Supplied contacts",
        city: city.trim() || "Remote",
      },
      budget: {
        ideal: Number(idealBudget) || 0,
        ceiling: Number(ceiling) || Number(idealBudget) || 0,
        currency: "INR",
      },
      negotiation_posture: authority === "confirm_only" ? "fast" : "balanced",
      negotiation_authority: authority,
      deal_breakers: constraints
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      questions_to_ask: questions
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      supplied_targets: targetLines,
      language_pref: "en",
    };

    try {
      const created = await fetch("/api/orchestrator/requirements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ spec, source_path: "universal_written_intake" }),
      });
      const record = await created.json();
      if (!created.ok) throw new Error(record.error ?? "Could not save the outcome.");

      const confirmed = await fetch(`/api/orchestrator/requirements/${record.id}/confirm`, {
        method: "POST",
      });
      if (!confirmed.ok) throw new Error("Could not confirm the outcome.");

      await Promise.all(
        targetLines.map(async (line, index) => {
          const [name, phone = ""] = line.split("|").map((part) => part.trim());
          await fetch(`/api/orchestrator/requirements/${record.id}/candidates`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              listing_name: name || `Target ${index + 1}`,
              phone,
              service_type: taskType,
              address: market.trim() || city.trim() || "Supplied by user",
            }),
          });
        }),
      );

      localStorage.setItem("scout_requirement_id", record.id);
      setStatus("Outcome confirmed. Scout is ready to find targets or call the contacts you supplied.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not confirm this outcome.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="universal-intake">
      <header className="intake-heading">
        <p>DELEGATE THE OUTCOME</p>
        <h1>Tell Scout what needs to happen.</h1>
        <span>
          Scout asks for missing details, confirms what it may negotiate, then finds or calls every
          relevant target and returns the exact terms they agreed to.
        </span>
      </header>

      <section className="intake-mode-switch" aria-label="Choose intake method">
        <button type="button" data-active={mode === "voice"} onClick={() => setMode("voice")}>
          <Mic size={17} /> Speak with Scout <small>Primary</small>
        </button>
        <button type="button" data-active={mode === "write"} onClick={() => setMode("write")}>
          <MessageSquareText size={17} /> Write the outcome <small>Alternative</small>
        </button>
      </section>

      {mode === "voice" ? (
        <VoiceIntakePanel onConfirmed={setStatus} />
      ) : (
        <section className="written-intake-shell">
          <div className="written-intake-form">
            <div className="form-section-head">
              <div>
                <p>WRITTEN OUTCOME</p>
                <h2>Start with the result you want.</h2>
              </div>
              <span>Scout will use these details on every call.</span>
            </div>

            <div className="task-choice-grid">
              {TASKS.map((task) => (
                <button
                  type="button"
                  key={task.value}
                  data-active={taskType === task.value}
                  onClick={() => setTaskType(task.value)}
                >
                  <strong>{task.label}</strong>
                  <span>{task.example}</span>
                </button>
              ))}
            </div>

            <label className="intake-field">
              <span>What outcome should Scout achieve?</span>
              <textarea
                className={INPUT}
                rows={4}
                value={outcome}
                onChange={(event) => setOutcome(event.target.value)}
                placeholder="Example: Contact shortlisted providers, confirm availability and all-in pricing, then negotiate within my approved limit."
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="intake-field">
                <span>Market, area, or search location</span>
                <input className={INPUT} value={market} onChange={(event) => setMarket(event.target.value)} placeholder="Koramangala or Remote" />
              </label>
              <label className="intake-field">
                <span>City or region</span>
                <input className={INPUT} value={city} onChange={(event) => setCity(event.target.value)} placeholder="Bengaluru" />
              </label>
            </div>

            <label className="intake-field">
              <span>Known targets or phone numbers <small>Optional, one per line: Name | Phone</small></span>
              <textarea
                className={INPUT}
                rows={3}
                value={targets}
                onChange={(event) => setTargets(event.target.value)}
                placeholder={"Acme Services | +91...\nNorthstar Vendor | +91..."}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="intake-field">
                <span>Target budget</span>
                <input className={INPUT} type="number" min="0" value={idealBudget} onChange={(event) => setIdealBudget(event.target.value)} placeholder="15000" />
              </label>
              <label className="intake-field">
                <span>Hard ceiling</span>
                <input className={INPUT} type="number" min="0" value={ceiling} onChange={(event) => setCeiling(event.target.value)} placeholder="16000" />
              </label>
              <label className="intake-field">
                <span>Scout may</span>
                <select className={INPUT} value={authority} onChange={(event) => setAuthority(event.target.value as typeof authority)}>
                  <option value="confirm_only">Ask and confirm only</option>
                  <option value="negotiate">Negotiate within limits</option>
                  <option value="provisional_agreement">Secure provisional agreement</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="intake-field">
                <span>Questions Scout must ask <small>One per line</small></span>
                <textarea className={INPUT} rows={4} value={questions} onChange={(event) => setQuestions(event.target.value)} placeholder={"Is it available?\nWhat is the all-in price?\nWhat conditions apply?"} />
              </label>
              <label className="intake-field">
                <span>Hard limits and deal breakers <small>One per line</small></span>
                <textarea className={INPUT} rows={4} value={constraints} onChange={(event) => setConstraints(event.target.value)} placeholder={"Do not exceed the ceiling\nDo not commit without approval"} />
              </label>
            </div>
          </div>

          <aside className="outcome-preview">
            <p>SCOUT WILL</p>
            <h2>{selectedTask.label}</h2>
            <ol>
              <li><Target size={17} /><span>Find relevant targets or use your contact list</span></li>
              <li><PhoneCall size={17} /><span>Call, ask, follow up, and negotiate within limits</span></li>
              <li><FileCheck2 size={17} /><span>Return accepted, declined, and conditional terms</span></li>
            </ol>
            <div className="preview-guardrail">
              <CheckCircle2 size={17} />
              <span>You approve any binding commitment.</span>
            </div>
            <button type="button" className="btn outcome-submit" disabled={!ready || saving} onClick={() => void confirmWrittenOutcome()}>
              {saving ? "Confirming..." : "Confirm outcome"} <ArrowRight size={16} />
            </button>
            <a href="/discover">Continue to targets <ArrowRight size={15} /></a>
            {status && <div className="intake-status" role="status">{status}</div>}
          </aside>
        </section>
      )}

      {mode === "voice" && status && <div className="intake-status voice-status" role="status">{status}</div>}
    </div>
  );
}
