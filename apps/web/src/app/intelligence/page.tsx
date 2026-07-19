"use client";

import { useState } from "react";

type Strategy = {
  state: string;
  current_state: { current_offer: number; fair_market_value: number | null; target_price: number; reserve_price: number; counter_round: number; max_counter_rounds: number };
  vendor_intelligence: { flexibility: string; historical_discount_percent: number; typical_counter_round: number; observed_signals: string[] };
  conversation_climate: { annoyance: number; urgency: number; friendliness: number; flexibility: number; guidance: string };
  verified_leverage: Array<{ type: string; value: number; evidence?: { listing_name?: string } }>;
  next_action: { action: string; confidence: number; rationale: string; verbalization_brief: string };
  guardrails: string[];
};

const INPUT = { vertical: "moving", posture: "balanced", current_offer: 2050, target_price: 1900, reserve_price: 2100, fair_market_value: 1950, counter_round: 1, leverage: [{ type: "comparable_unit", value: 1900, verified: true, evidence: { listing_name: "Northline Moving" } }], transcript: "Sure, let me see what I can do.", vendor: { average_discount_percent: 12, typical_counter_round: 2, observed_signals: ["drops price after counter two"] } };

const INITIAL: Strategy = {
  state: "counter_offer",
  current_state: { current_offer: 2050, fair_market_value: 1950, target_price: 1900, reserve_price: 2100, counter_round: 1, max_counter_rounds: 2 },
  vendor_intelligence: { flexibility: "high", historical_discount_percent: 12, typical_counter_round: 2, observed_signals: ["drops price after counter two"] },
  conversation_climate: { annoyance: 0, urgency: 0, friendliness: 0.5, flexibility: 0.5, guidance: "A polite, specific counteroffer is appropriate." },
  verified_leverage: [{ type: "comparable_unit", value: 1900, evidence: { listing_name: "Northline Moving" } }],
  next_action: { action: "mention_verified_competitor", confidence: 0.82, rationale: "A real comparable quote is available and this vendor has historically moved after a second counteroffer.", verbalization_brief: "We have a verified comparable quote around $1,900. Is there any flexibility if we bring this back for client confirmation today?" },
  guardrails: ["Use only verified leverage supplied by Scout.", "Never claim a false competing bid, availability, or deadline.", "Never pay, sign, reserve, or make a binding commitment."],
};

export default function IntelligencePage() {
  const [strategy, setStrategy] = useState<Strategy>(INITIAL);
  const [status, setStatus] = useState<"ready" | "running" | "live" | "offline">("ready");
  async function runDecision() {
    setStatus("running");
    try {
      const res = await fetch("/api/orchestrator/strategy", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(INPUT) });
      const data = await res.json();
      if (!res.ok || !data.strategy) throw new Error("strategy unavailable");
      setStrategy(data.strategy as Strategy);
      setStatus("live");
    } catch { setStatus("offline"); }
  }
  const next = strategy.next_action;
  const current = strategy.current_state;
  return <div className="space-y-7">
    <header className="max-w-3xl"><p className="mono text-[11px] uppercase tracking-[0.18em] text-rust">Scout core engine · provider-neutral</p><h1 className="mt-2 text-4xl leading-[1.05] sm:text-5xl">The model speaks.<br />The engine decides.</h1><p className="mt-4 max-w-2xl text-base leading-relaxed text-charcoal/75">Scout&apos;s negotiation intelligence uses market truth, real competitor quotes, vendor history, and conversational climate before the voice agent says a word.</p></header>
    <div className="flex flex-wrap items-center gap-2 border-y border-line py-3"><span className="mono mr-2 text-[10px] uppercase tracking-widest text-charcoal/50">MVP vertical</span><span className="pill pill-sage">MOVING COMPANIES</span><span className="pill">CONFIG-DRIVEN</span><span className="pill">TRUTHFUL LEVERAGE ONLY</span>{status === "live" && <span className="pill pill-sage">LIVE ENGINE RESPONSE</span>}{status === "offline" && <span className="pill pill-amber">SHOWING VERIFIED DEMO DECISION</span>}</div>
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="card overflow-hidden"><div className="border-b border-line bg-paper-2 px-5 py-4"><p className="mono text-[10px] uppercase tracking-[0.18em] text-charcoal/55">01 · situation board</p><h2 className="mt-1 text-xl">A $2,050 moving quote</h2></div><dl className="divide-y divide-line"><Metric label="Fair market value" value={money(current.fair_market_value)} note="area benchmark" /><Metric label="Negotiation goal" value={money(current.target_price)} note="customer ideal" /><Metric label="Hard ceiling" value={money(current.reserve_price)} note="never accept automatically" tone="rust" /><Metric label="Counter round" value={`${current.counter_round} / ${current.max_counter_rounds}`} note="balanced posture" /></dl><div className="p-5"><p className="mono text-[10px] uppercase tracking-[0.14em] text-charcoal/50">Verified leverage</p>{strategy.verified_leverage.map((item, index) => <div className="mt-2 rounded-md border border-line bg-paper p-3" key={`${item.type}-${index}`}><div className="flex items-center justify-between gap-3"><span className="mono text-[11px] uppercase text-ink">{item.type.replace(/_/g, " ")}</span><strong className="serif text-lg text-ink">{money(item.value)}</strong></div><p className="mt-1 text-xs text-charcoal/65">Evidence: {item.evidence?.listing_name ?? "confirmed Scout outcome"}</p></div>)}</div></section>
      <section className="border-2 border-ink bg-ink p-5 text-white shadow-[10px_10px_0_var(--rust)] sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="mono text-[10px] uppercase tracking-[0.18em] text-white/50">02 · best next action</p><h2 className="mt-2 text-3xl text-white">{next.action.replace(/_/g, " ")}</h2></div><div className="border border-white/35 px-3 py-2 text-right"><div className="mono text-[9px] uppercase tracking-widest text-white/45">confidence</div><div className="serif text-2xl text-white">{Math.round(next.confidence * 100)}%</div></div></div><div className="my-6 h-px bg-white/20" /><p className="text-sm leading-relaxed text-white/75">{next.rationale}</p><div className="mt-6 border-l-2 border-rust bg-white/5 p-4"><p className="mono text-[10px] uppercase tracking-[0.16em] text-white/45">Voice agent may say</p><p className="mt-2 font-serif text-xl leading-relaxed text-white">“{next.verbalization_brief}”</p></div><button onClick={runDecision} disabled={status === "running"} className="btn mt-6 bg-rust">{status === "running" ? "DECIDING…" : "RUN NEXT DECISION →"}</button></section>
    </div>
    <div className="grid gap-5 md:grid-cols-3"><Insight title="Vendor intelligence" label={strategy.vendor_intelligence.flexibility.toUpperCase()}>Historical average concession: {strategy.vendor_intelligence.historical_discount_percent}%. Usually responds around counter round {strategy.vendor_intelligence.typical_counter_round || "—"}.</Insight><Insight title="Conversation climate" label="PSYCHOLOGY LAYER">{strategy.conversation_climate.guidance} Friendliness signal: {Math.round(strategy.conversation_climate.friendliness * 100)}%.</Insight><Insight title="Learning loop" label="MEMORY LAYER">Final price, tactics, transcript signals, and outcomes become a vendor profile and market benchmark for the next call.</Insight></div>
    <section className="card p-5"><p className="mono text-[10px] uppercase tracking-[0.18em] text-charcoal/50">Non-negotiable guardrails</p><ul className="mt-3 grid gap-2 md:grid-cols-2">{strategy.guardrails.map((rule) => <li className="flex gap-2 text-sm text-charcoal/75" key={rule}><span className="text-rust">×</span>{rule}</li>)}</ul></section>
  </div>;
}
function Metric({ label, value, note, tone }: { label: string; value: string; note: string; tone?: "rust" }) { return <div className="flex items-center justify-between gap-5 px-5 py-4"><div><dt className="mono text-[10px] uppercase tracking-[0.13em] text-charcoal/50">{label}</dt><dd className="mt-1 text-xs text-charcoal/65">{note}</dd></div><strong className="serif text-2xl" style={{ color: tone === "rust" ? "var(--rust)" : "var(--ink)" }}>{value}</strong></div>; }
function Insight({ title, label, children }: { title: string; label: string; children: React.ReactNode }) { return <section className="card p-5"><p className="mono text-[10px] uppercase tracking-[0.14em] text-rust">{label}</p><h3 className="mt-2 text-xl">{title}</h3><p className="mt-3 text-sm leading-relaxed text-charcoal/70">{children}</p></section>; }
function money(value: number | null) { return value == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value); }
