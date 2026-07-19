"use client";

// The full agentic journey, visualized (Wispr-Flow style, Scout's story):
// intake call -> brief captured -> search -> OpenAI ranking -> ElevenLabs
// calls (accent-matched; no-answer -> next) -> transparent results.
// One looping GSAP timeline syncs the phone with the pipeline stepper.
// SIMULATED: scripted from a golden call — labeled in the UI.

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScoutMascot } from "./ScoutMascot";

const INTAKE: { speaker: "scout" | "user"; text: string }[] = [
  { speaker: "scout", text: "Hi! Where are we hunting, and what's the budget?" },
  { speaker: "user", text: "A 1-bed near Koramangala, under ₹16,000 — parking please." },
];

const NEGOTIATION: { speaker: "scout" | "seller"; text: string }[] = [
  { speaker: "seller", text: "Comfort Stay, hello?" },
  { speaker: "scout", text: "Hi — I'm Scout, an AI calling for a client. Any 1-bed from Aug 1?" },
  { speaker: "seller", text: "Yes — ₹15,000 with maintenance." },
  { speaker: "scout", text: "We hold a verified ₹13,900 nearby — any flexibility?" },
  { speaker: "seller", text: "…₹13,500 if they can visit this week." },
];

const RANKED = [
  { name: "Comfort Stay PG", meta: "4.6 ★ · 240 reviews · 0.8 km" },
  { name: "Zolo Nest PG", meta: "4.4 ★ · 310 reviews · 1.2 km" },
  { name: "Sunrise Luxury PG", meta: "4.1 ★ · 88 reviews · 1.9 km" },
];

const BARS = 26;

export function LiveCallDemo() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context((self) => {
      const q = self.selector!;
      const phone = q(".demo-phone")[0] as HTMLElement;
      const intakeCaps = gsap.utils.toArray<HTMLElement>(".cap-intake");
      const negoCaps = gsap.utils.toArray<HTMLElement>(".cap-nego");
      const states = gsap.utils.toArray<HTMLElement>(".state-card");
      const pins = gsap.utils.toArray<HTMLElement>(".map-pin");
      const rankRows = gsap.utils.toArray<HTMLElement>(".rank-row");
      const callRows = gsap.utils.toArray<HTMLElement>(".call-row");

      const activate = (i: number) =>
        gsap.timeline()
          .call(() => states.forEach((s, k) => s.classList.toggle("is-active", k === i)))
          .fromTo(states[i], { scale: 0.97 }, { scale: 1, duration: 0.35, ease: "back.out(2)" }, 0);

      const tl = gsap.timeline({
        repeat: -1,
        repeatDelay: 1.8,
        scrollTrigger: { trigger: phone, start: "top 85%", toggleActions: "play pause resume pause" },
      });

      // ---- Reset --------------------------------------------------------
      tl.set(".scr-intake", { autoAlpha: 1 });
      tl.set(".scr-nego", { autoAlpha: 0 });
      tl.set([intakeCaps, negoCaps], { autoAlpha: 0, y: 14 });
      tl.set(".brief-chip", { autoAlpha: 0, scale: 0.9 });
      tl.set(".demo-outcome", { autoAlpha: 0, scale: 0.8 });
      tl.set(pins, { scale: 0, transformOrigin: "50% 100%" });
      tl.set(".search-count", { textContent: "" });
      tl.set(rankRows, { y: (i) => [52, -52, 0][i], autoAlpha: 0.4 }); // discovery order
      tl.set(callRows, { autoAlpha: 0.35, x: 0 });
      tl.set(".row-status", { textContent: "queued" });
      tl.call(() => states.forEach((s) => s.classList.remove("is-active", "is-done")));

      // ---- 1 · Intake call ---------------------------------------------
      tl.add(activate(0));
      tl.call(() => { phone.dataset.speaker = "scout"; });
      INTAKE.forEach((turn, i) => {
        tl.call(() => { phone.dataset.speaker = turn.speaker === "user" ? "seller" : "scout"; });
        tl.to(intakeCaps[i], { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" }, i ? "+=1.0" : "+=0.4");
      });
      tl.to(".brief-chip", { autoAlpha: 1, scale: 1, duration: 0.45, ease: "back.out(2)" }, "+=0.7");
      tl.call(() => states[0].classList.add("is-done"));

      // ---- 2 · Search ----------------------------------------------------
      tl.add(activate(1), "+=0.5");
      tl.to(pins, { scale: 1, duration: 0.35, ease: "back.out(2.5)", stagger: 0.06 });
      tl.to(".search-count", { textContent: "14 places found", duration: 0.1 });
      tl.call(() => states[1].classList.add("is-done"), [], "+=0.5");

      // ---- 3 · Rank (OpenAI) --------------------------------------------
      tl.add(activate(2), "+=0.3");
      tl.to(rankRows, { y: 0, autoAlpha: 1, duration: 0.7, ease: "power3.inOut", stagger: 0.08 });
      tl.call(() => states[2].classList.add("is-done"), [], "+=0.5");

      // ---- 4 · Calls (ElevenLabs) ---------------------------------------
      tl.add(activate(3), "+=0.3");
      // #1 Sunrise: rings… no answer -> next.
      tl.to(callRows[0], { autoAlpha: 1, duration: 0.3 });
      tl.to(q(".row-status")[0], { textContent: "ringing…", duration: 0.1 });
      tl.to(callRows[0], { x: 3, duration: 0.07, yoyo: true, repeat: 5 }, "+=0.7");
      tl.to(q(".row-status")[0], { textContent: "no answer → next", duration: 0.1 });
      tl.to(callRows[0], { autoAlpha: 0.45, duration: 0.3 });
      // #2 Comfort Stay: connects — phone flips to the negotiation.
      tl.to(callRows[1], { autoAlpha: 1, duration: 0.3 }, "+=0.4");
      tl.to(q(".row-status")[1], { textContent: "connected · negotiating…", duration: 0.1 });
      tl.to(".scr-intake", { autoAlpha: 0, duration: 0.4 }, "<");
      tl.to(".scr-nego", { autoAlpha: 1, duration: 0.4 }, "<");
      NEGOTIATION.forEach((turn, i) => {
        tl.call(() => { phone.dataset.speaker = turn.speaker === "scout" ? "scout" : "seller"; });
        tl.to(negoCaps[i], { autoAlpha: 1, y: 0, duration: 0.45, ease: "power2.out" }, i ? "+=0.9" : "+=0.2");
        if (i > 0) tl.to(negoCaps[i - 1], { autoAlpha: 0.35, duration: 0.35 }, "<");
      });
      tl.to(q(".row-status")[1], { textContent: "₹15,000 → ₹13,500 ✓", duration: 0.1 });
      tl.call(() => states[3].classList.add("is-done"));

      // ---- 5 · Report ----------------------------------------------------
      tl.add(activate(4), "+=0.4");
      tl.to(".demo-outcome", { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(2)" });
      tl.to({}, { duration: 2 });
      tl.to([intakeCaps, negoCaps, ".brief-chip"], { autoAlpha: 0, duration: 0.5 });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="relative">
      <div className="mb-10 max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rust">
          The whole hunt, agentic
        </p>
        <h2 className="mt-2 text-4xl">Say it once. Watch Scout run.</h2>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-charcoal/70">
          Speak your brief on a call — Scout searches the area, ranks every option, phones them
          one by one in the region's own accent, and shows you every move it makes.
        </p>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[320px_1fr]">
        {/* ================= Phone ================= */}
        <div className="demo-phone relative mx-auto w-[300px]" data-speaker="scout">
          <div className="card relative overflow-hidden rounded-[44px] p-0" style={{ height: 560 }}>
            <div className="absolute left-1/2 top-3 z-20 h-6 w-28 -translate-x-1/2 rounded-full bg-ink/90" />

            {/* Screen A: intake with the user */}
            <div className="scr-intake absolute inset-0 flex flex-col rounded-[44px] px-5 pb-6 pt-14">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">Scout · intake</p>
                  <p className="text-[10px] uppercase tracking-wide text-secondary">
                    <span className="pulse mr-1 inline-block h-2 w-2 rounded-full bg-red align-middle" />
                    live · captioned
                  </p>
                </div>
                <span className="pill">YOU</span>
              </div>
              <div className="demo-wave mt-5 flex h-14 items-center justify-center gap-[3px]">
                {Array.from({ length: BARS }).map((_, i) => (
                  <span key={i} className="wavebar" style={{ animationDelay: `${(i % 7) * 0.09}s`, animationDuration: `${0.7 + ((i * 37) % 40) / 100}s` }} />
                ))}
              </div>
              <div className="mt-5 flex-1 space-y-2.5">
                {INTAKE.map((t, i) => (
                  <p key={i} className={`cap-intake max-w-[92%] rounded-2xl px-3.5 py-2 text-[12.5px] leading-snug ${t.speaker === "user" ? "ml-auto bg-white/60 text-ink" : "bg-rust/90 text-white"}`} style={{ opacity: 0 }}>
                    {t.text}
                  </p>
                ))}
                <div className="brief-chip card mx-auto mt-4 w-fit px-4 py-2.5 text-center" style={{ opacity: 0 }}>
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-secondary">Brief captured</p>
                  <p className="mt-0.5 text-[12px] font-medium text-ink">📍 Koramangala · ₹16,000 · 1-bed · parking</p>
                </div>
              </div>
            </div>

            {/* Screen B: outbound negotiation */}
            <div className="scr-nego absolute inset-0 flex flex-col rounded-[44px] px-5 pb-6 pt-14" style={{ opacity: 0 }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">Comfort Stay PG</p>
                  <p className="text-[10px] uppercase tracking-wide text-secondary">
                    <span className="pulse mr-1 inline-block h-2 w-2 rounded-full bg-red align-middle" />
                    ranked #1 · calling
                  </p>
                </div>
                <span className="pill">SCOUT</span>
              </div>
              <div className="demo-wave mt-5 flex h-14 items-center justify-center gap-[3px]">
                {Array.from({ length: BARS }).map((_, i) => (
                  <span key={i} className="wavebar" style={{ animationDelay: `${(i % 7) * 0.09}s`, animationDuration: `${0.7 + ((i * 41) % 40) / 100}s` }} />
                ))}
              </div>
              <p className="mt-2 text-center text-[10px] text-secondary">🎙 ElevenLabs · regional accent matched</p>
              <div className="mt-4 flex-1 space-y-2.5 overflow-hidden">
                {NEGOTIATION.map((t, i) => (
                  <p key={i} className={`cap-nego max-w-[92%] rounded-2xl px-3.5 py-2 text-[12.5px] leading-snug ${t.speaker === "scout" ? "ml-auto bg-rust/90 text-white" : "bg-white/60 text-ink"}`} style={{ opacity: 0 }}>
                    {t.text}
                  </p>
                ))}
              </div>
              <div className="demo-outcome mx-auto mb-1" style={{ opacity: 0 }}>
                <span className="rec-stamp">Saved ₹1,500 · transcript ✓</span>
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-[10px] uppercase tracking-wide text-secondary">
            Simulated demo — scripted from a golden call
          </p>
        </div>

        {/* ================= Pipeline ================= */}
        <div className="relative">
          <ScoutMascot className="pointer-events-none absolute -top-16 right-2 hidden w-28 rotate-6 lg:block" />
          <ol className="space-y-4">
            {/* 1 · Listen */}
            <li className="state-card card p-5">
              <StateHead n="01" title="Listen & capture" tag="voice intake" />
              <p className="mt-2 text-sm text-charcoal/70">
                Location, budget, must-haves — parsed live from the call into one confirmed brief.
              </p>
            </li>

            {/* 2 · Search */}
            <li className="state-card card p-5">
              <StateHead n="02" title="Search the area" tag="places api" />
              <div className="mt-3 flex items-center gap-5">
                <div className="relative h-20 w-32 overflow-hidden rounded-xl bg-white/40">
                  <span className="absolute left-3 top-4 h-px w-24 bg-line" />
                  <span className="absolute left-7 top-0 h-20 w-px bg-line" />
                  <span className="absolute left-16 top-0 h-20 w-px bg-line" />
                  {[
                    [14, 30], [34, 12], [52, 40], [72, 18], [88, 46], [44, 58], [102, 30], [20, 52],
                  ].map(([x, y], i) => (
                    <span key={i} className="map-pin absolute h-2.5 w-2.5 rounded-full bg-rust" style={{ left: x, top: y }} />
                  ))}
                </div>
                <p className="search-count text-sm font-medium text-ink" />
              </div>
            </li>

            {/* 3 · Rank */}
            <li className="state-card card p-5">
              <StateHead n="03" title="Check & rank" tag="openai" />
              <div className="mt-3 space-y-2">
                {RANKED.map((r, i) => (
                  <div key={r.name} className="rank-row flex items-center justify-between rounded-xl bg-white/45 px-3.5 py-2">
                    <div className="flex items-center gap-2.5">
                      <span className="mono text-[11px] text-secondary">#{i + 1}</span>
                      <span className="text-sm font-medium text-ink">{r.name}</span>
                    </div>
                    <span className="text-[11px] text-secondary">{r.meta}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-secondary">reviews · rating · distance · your requirements</p>
            </li>

            {/* 4 · Call */}
            <li className="state-card card p-5">
              <StateHead n="04" title="Call & negotiate" tag="elevenlabs voice" />
              <div className="mt-3 space-y-2">
                {["Sunrise Luxury PG", "Comfort Stay PG", "Zolo Nest PG"].map((name, i) => (
                  <div key={name} className="call-row flex items-center justify-between rounded-xl bg-white/45 px-3.5 py-2">
                    <span className="flex items-center gap-2.5 text-sm font-medium text-ink">📞 {name}</span>
                    <span className="row-status mono text-[11px] text-secondary">queued</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-secondary">
                No answer? Scout moves down the list — and shows you every number it dialed.
              </p>
            </li>

            {/* 5 · Report */}
            <li className="state-card card p-5">
              <StateHead n="05" title="Report back" tag="evidence" />
              <p className="mt-2 text-sm text-charcoal/70">
                Ranked results with prices, risk flags, who answered, who didn't — every claim
                linked to its transcript line.
              </p>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function StateHead({ n, title, tag }: { n: string; title: string; tag: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="call-idx !text-[26px]">{n}</span>
        <h3 className="text-lg">{title}</h3>
      </div>
      <span className="pill">{tag.toUpperCase()}</span>
    </div>
  );
}
