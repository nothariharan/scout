"use client";

import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { FileUp, Mic, PhoneOff, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

type OutcomeInput = Record<string, unknown>;

export function VoiceIntakePanel({ onConfirmed }: { onConfirmed: (message: string, requirementId?: string) => void }) {
  return (
    <ConversationProvider>
      <VoiceIntake onConfirmed={onConfirmed} />
    </ConversationProvider>
  );
}

function VoiceIntake({ onConfirmed }: { onConfirmed: (message: string, requirementId?: string) => void }) {
  const [agentId, setAgentId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const conversation = useConversation({
    clientTools: {
      submit_scout_outcome: async (parameters: OutcomeInput) => submitOutcome(parameters, onConfirmed),
      // Keep the deployed legacy tool name working while its schema is upgraded.
      submit_real_estate_brief: async (parameters: OutcomeInput) => submitOutcome(parameters, onConfirmed),
    },
    onError: (error) =>
      setNotice(typeof error === "string" ? error : "Scout could not connect to the voice service."),
  });

  useEffect(() => {
    void fetch("/api/elevenlabs/intake-agent", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        setAgentId(body.agentId);
      })
      .catch((cause: unknown) =>
        setNotice(cause instanceof Error ? cause.message : "Voice intake is unavailable."),
      );
  }, []);

  const connected = conversation.status === "connected";
  const connecting = conversation.status === "connecting";

  async function toggleConversation() {
    if (connected) {
      await conversation.endSession();
      setNotice("Voice session ended. Your outcome is saved only after you confirm Scout's summary.");
      return;
    }
    if (!agentId) return;

    setNotice("Requesting microphone access...");
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({ agentId });
      setNotice("Connected. Describe the property you need. Scout will confirm the locality, timing, budget, and non-negotiables before saving.");
    } catch {
      setNotice("Microphone access is required. You can switch to Write the outcome instead.");
    }
  }

  async function uploadDocument(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await conversation.uploadFile(file);
      setNotice(
        `${file.name} was sent to Scout. It will extract useful contacts and constraints, ask about anything missing, then read the outcome back for confirmation.`,
      );
    } catch {
      setNotice("Scout could not read that file. Try a clear image, PDF, text file, or use the written outcome.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <section className="voice-intake-primary">
      <div className="voice-intake-copy">
        <p>VOICE OUTCOME</p>
        <h2>Say what you want handled.</h2>
        <span>
          Speak naturally. Scout turns the conversation into one reusable instruction for every target
          it finds or every contact you provide.
        </span>
        <ol>
          <li><Sparkles size={17} /><span><strong>Understands the goal</strong> and asks only for missing details.</span></li>
          <li><Mic size={17} /><span><strong>Confirms call questions</strong>, timing, limits, and negotiation authority.</span></li>
          <li><ShieldCheck size={17} /><span><strong>Reads the outcome back</strong> before anything is saved or called.</span></li>
        </ol>
      </div>

      <div className="voice-intake-control">
        <button
          type="button"
          className="voice-orb-button"
          data-live={connected}
          disabled={!agentId || connecting}
          onClick={() => void toggleConversation()}
          aria-label={connected ? "End voice outcome session" : "Start voice outcome session"}
        >
          <span className="voice-orb-core">{connected ? <PhoneOff size={28} /> : <Mic size={30} />}</span>
          <i aria-hidden="true" />
          <i aria-hidden="true" />
        </button>
        <strong>{connecting ? "Connecting..." : connected ? "Scout is listening" : "Talk to Scout"}</strong>
        <span>{connected ? "Describe the outcome or answer Scout's next question." : "Tap once, then speak in your own words."}</span>
        <small data-live={connected}>{connected ? "LIVE VOICE SESSION" : agentId ? "READY" : "VOICE UNAVAILABLE"}</small>

        {connected ? (
          <label className="voice-upload">
            <FileUp size={15} /> {uploading ? "Reading file..." : "Add supporting document"}
            <input
              className="sr-only"
              type="file"
              accept="application/pdf,image/*,.txt,.doc,.docx"
              disabled={uploading}
              onChange={(event) => void uploadDocument(event)}
            />
          </label>
        ) : null}
      </div>

      {notice ? <p className="voice-intake-notice" role="status">{notice}</p> : null}
    </section>
  );
}

async function submitOutcome(parameters: OutcomeInput, onConfirmed: (message: string, requirementId?: string) => void) {
  const pick = (...names: string[]) => {
    for (const name of names) {
      const value = String(parameters[name] ?? "").trim();
      if (value) return value;
    }
    return "";
  };
  const number = (names: string[], fallback: number) => {
    const candidate = names.map((name) => Number(parameters[name])).find(Number.isFinite);
    return candidate ?? fallback;
  };
  const list = (...names: string[]) => {
    for (const name of names) {
      const value = parameters[name];
      if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
      if (typeof value === "string" && value.trim()) {
        return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
      }
    }
    return [];
  };

  const area = pick("area", "market", "region", "search_area");
  const city = pick("city");
  const dealType = pick("deal_type") || "hostel";
  if (!area || !city) return "Before I save this, tell me the locality and city for the property search.";

  const ideal = number(["budget_ideal", "ideal_budget", "target_budget"], 0);
  const ceiling = number(["budget_ceiling", "hard_ceiling", "maximum_budget"], ideal);
  if (ceiling > 0 && ideal > ceiling) {
    return "Your target budget is above your hard ceiling. Please confirm the two limits before I save the outcome.";
  }

  const spec = {
    vertical: "real_estate",
    deal_type: dealType,
    location: { area, city, pincode: pick("pincode") || undefined },
    budget: { ideal, ceiling, currency: pick("currency") || "INR" },
    negotiation_posture: pick("negotiation_posture") || "balanced",
    deal_breakers: list("deal_breakers", "constraints", "hard_limits"),
    language_pref: pick("language_pref", "language") || "en",
    occupancy: number(["occupancy"], 1),
    furnishing: pick("furnishing") || "semi",
    amenities: list("amenities"),
    move_in_date: pick("move_in_date", "start_date", "deadline"),
    lease_duration_months: number(["lease_duration_months"], 1),
  };

  if (!spec.move_in_date || ideal <= 0 || ceiling <= 0) {
    return "Before I save this, please confirm the move-in date and the all-inclusive target and maximum budget.";
  }

  const created = await fetch("/api/orchestrator/requirements", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ spec, source_path: "elevenlabs_voice_real_estate_intake" }),
  });
  const record = await created.json();
  if (!created.ok) return `I could not save the outcome: ${record.error ?? "unknown error"}`;

  const confirmed = await fetch(`/api/orchestrator/requirements/${record.id}/confirm`, { method: "POST" });
  const result = await confirmed.json();
  if (!confirmed.ok) return `I could not confirm the outcome: ${result.error ?? "unknown error"}`;

  localStorage.setItem("scout_requirement_id", result.id);
  onConfirmed("Property brief confirmed. Scout is finding nearby candidates for your review.", result.id);
  return "The property brief is saved and confirmed. Tell the user Scout is now finding nearby candidates for review.";
}
