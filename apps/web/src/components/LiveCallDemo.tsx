"use client";

// The whole agentic journey, visualized (Wispr-Flow-grade device demo):
// outcome capture -> target discovery -> qualification -> disclosed outbound calls
// -> follow-up and negotiation -> evidence-backed agreed terms.
// One looping GSAP timeline syncs the phone with the pipeline stepper.
// The Dynamic Island expands into a call live-activity when Scout's outbound
// call connects. SIMULATED: scripted from a golden call — labeled in the UI.

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Mic,
  MapPin,
  Sparkles,
  PhoneCall,
  FileCheck2,
  Phone,
  Star,
} from "lucide-react";
import { NeighborhoodMap } from "./NeighborhoodMap";
import { ScoutMascot } from "./ScoutMascot";
import { IPhoneFrame } from "./ui/IPhoneFrame";

type TranscriptTurn = { tag: string; me: boolean; text: string; time: string };

const INTAKE: TranscriptTurn[] = [
  { tag: "Scout", me: false, time: "00:02", text: "What do you need me to find or negotiate?" },
  { tag: "You", me: true, time: "00:06", text: "A 1-bed PG near Koramangala. Budget ₹16k, parking required. Negotiate the rent." },
  { tag: "Scout", me: false, time: "00:14", text: "Understood. I will shortlist matches, call each one, and return their final terms." },
];

const NEGOTIATION: TranscriptTurn[] = [
  { tag: "Scout", me: true, time: "00:04", text: "Hi, I am Scout, an AI agent calling for a client. Is a 1-bed available Aug 1?" },
  { tag: "Comfort Stay", me: false, time: "00:12", text: "Yes. ₹15,000 with maintenance included." },
  { tag: "Scout", me: true, time: "00:21", text: "Their limit is ₹14,000. What is your best all-in price for a visit this week?" },
  { tag: "Comfort Stay", me: false, time: "00:36", text: "₹13,500 all-in. Available Aug 1, and I will hold it until Friday." },
];

const RANKED = [
  { name: "Comfort Stay PG", meta: "4.6 ★ · 240 reviews · 0.8 km" },
  { name: "Zolo Nest PG", meta: "4.4 ★ · 310 reviews · 1.2 km" },
  { name: "Sunrise Luxury PG", meta: "4.1 ★ · 88 reviews · 1.9 km" },
];

// Bell-curve waveform silhouette with deterministic texture (no Math.random —
// values must match between server and client render).
const BARS = 30;
const AMPS = Array.from({ length: BARS }, (_, i) => {
  const x = (i - (BARS - 1) / 2) / 8.5;
  const bell = Math.exp(-x * x);
  const noise = ((i * 73) % 29) / 29;
  return Math.max(0.16, +(bell * (0.5 + 0.5 * noise)).toFixed(2));
});

const fmtTimer = (s: number) => {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

function Waveform({ seed }: { seed: number }) {
  return (
    <div className="demo-wave flex h-12 items-center justify-center gap-[2.5px]">
      {AMPS.map((amp, i) => (
        <span
          key={i}
          className="wavebar"
          style={
            {
              "--amp": amp,
              animationDelay: `${(i % 7) * 0.09}s`,
              animationDuration: `${0.62 + ((i * seed) % 40) / 90}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

// Live transcript row: speech activity appears first, then the timestamped
// caption resolves as the simulated speaker finishes the phrase.
function CapRow({
  turn,
  cls,
}: {
  turn: TranscriptTurn;
  cls: string;
}) {
  return (
    <div className="relative">
      <span
        className={`${cls}-typing typing ${turn.me ? "typing-me" : ""} absolute top-0 ${turn.me ? "right-0" : "left-0"}`}
        style={{ opacity: 0 }}
      >
        <span />
        <span />
        <span />
      </span>
      <p className={`${cls} cap ${turn.me ? "cap-me" : "cap-them"}`} style={{ opacity: 0 }}>
        <span className="cap-tag"><b>{turn.tag}</b><time>{turn.time}</time></span>
        {turn.text}
      </p>
    </div>
  );
}

export function LiveCallDemo() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context((self) => {
      const q = self.selector!;
      const phone = q(".demo-phone")[0] as HTMLElement;
      const frame = q(".iphone")[0] as HTMLElement;
      const timerEl = q(".di-timer")[0] as HTMLElement;
      const states = gsap.utils.toArray<HTMLElement>(".state-card");
      const rankRows = gsap.utils.toArray<HTMLElement>(".rank-row");
      const callRows = gsap.utils.toArray<HTMLElement>(".call-row");

      const SPRING = "back.out(1.8)";

      const activate = (i: number) =>
        gsap.timeline()
          .call(() => states.forEach((s, k) => s.classList.toggle("is-active", k === i)))
          .fromTo(states[i], { scale: 0.97 }, { scale: 1, duration: 0.35, ease: "back.out(2)" }, 0);

      // Typing dots spring up at the tail corner, then the bubble takes over.
      const speak = (cls: string, me: boolean) => {
        const seg = gsap.timeline();
        seg.call(() => {
          phone.dataset.speaker = me ? "scout" : "seller";
        });
        seg.fromTo(
          `.${cls}-typing`,
          { autoAlpha: 0, scale: 0.5 },
          { autoAlpha: 1, scale: 1, duration: 0.3, ease: SPRING },
        );
        seg.to(`.${cls}-typing`, { autoAlpha: 0, scale: 0.6, duration: 0.18 }, "+=0.55");
        seg.fromTo(
          `.${cls}`,
          { autoAlpha: 0, scale: 0.82, y: 14 },
          { autoAlpha: 1, scale: 1, y: 0, duration: 0.5, ease: SPRING },
          "-=0.05",
        );
        return seg;
      };

      const tl = gsap.timeline({
        repeat: -1,
        repeatDelay: 1.8,
        scrollTrigger: { trigger: phone, start: "top 85%", toggleActions: "play pause resume pause" },
      });

      const timer = { s: 0 };

      // ---- Reset --------------------------------------------------------
      tl.set(".scr-intake", { autoAlpha: 1 });
      tl.set(".scr-nego", { autoAlpha: 0 });
      tl.set([".cap", ".typing"], { autoAlpha: 0 });
      tl.set(".brief-chip", { autoAlpha: 0, scale: 0.9 });
      tl.set(".demo-outcome", { autoAlpha: 0, scale: 0.8 });
      tl.set(".search-count", { textContent: "" });
      tl.set(rankRows, { y: (i) => [52, -52, 0][i], autoAlpha: 0.4 }); // discovery order
      tl.set(callRows, { autoAlpha: 0.35, x: 0 });
      tl.set(".row-status", { textContent: "queued" });
      tl.call(() => {
        states.forEach((s) => s.classList.remove("is-active", "is-done"));
        frame.dataset.island = "idle";
        timer.s = 0;
        timerEl.textContent = fmtTimer(0);
      });

      // ---- 1 · Intake call ---------------------------------------------
      tl.add(activate(0));
      tl.call(() => { phone.dataset.speaker = "scout"; });
      INTAKE.forEach((turn, i) => {
        tl.add(speak(`cap-intake-${i}`, turn.me), i ? "+=0.8" : "+=0.4");
      });
      tl.to(".brief-chip", { autoAlpha: 1, scale: 1, duration: 0.45, ease: "back.out(2)" }, "+=0.7");
      tl.call(() => states[0].classList.add("is-done"));

      // ---- 2 · Search ----------------------------------------------------
      tl.add(activate(1), "+=0.5");
      tl.to(".search-count", { textContent: "14 relevant targets found", duration: 0.1 }, "+=0.6");
      tl.call(() => states[1].classList.add("is-done"), [], "+=0.5");

      // ---- 3 · Qualify --------------------------------------------
      tl.add(activate(2), "+=0.3");
      tl.to(rankRows, { y: 0, autoAlpha: 1, duration: 0.7, ease: "power3.inOut", stagger: 0.08 });
      tl.call(() => states[2].classList.add("is-done"), [], "+=0.5");

      // ---- 4 · Calls, follow-up and negotiation ---------------------------------------
      tl.add(activate(3), "+=0.3");
      // #1 Sunrise: rings… no answer -> next.
      tl.to(callRows[0], { autoAlpha: 1, duration: 0.3 });
      tl.to(q(".row-status")[0], { textContent: "ringing…", duration: 0.1 });
      tl.to(callRows[0], { x: 3, duration: 0.07, yoyo: true, repeat: 5 }, "+=0.7");
      tl.to(q(".row-status")[0], { textContent: "no answer → next", duration: 0.1 });
      tl.to(callRows[0], { autoAlpha: 0.45, duration: 0.3 });
      // #2 Comfort Stay: connects — the island blooms into a live activity
      // and the phone flips to the negotiation.
      tl.to(callRows[1], { autoAlpha: 1, duration: 0.3 }, "+=0.4");
      tl.to(q(".row-status")[1], { textContent: "connected · negotiating…", duration: 0.1 });
      tl.to(".scr-intake", { autoAlpha: 0, duration: 0.4 }, "<");
      tl.to(".scr-nego", { autoAlpha: 1, duration: 0.4 }, "<");
      tl.call(() => { frame.dataset.island = "live"; });
      tl.to(timer, {
        s: 47,
        duration: 8.2,
        ease: "none",
        onUpdate: () => { timerEl.textContent = fmtTimer(timer.s); },
      }, "<");
      NEGOTIATION.forEach((turn, i) => {
        tl.add(speak(`cap-nego-${i}`, turn.me), i ? "+=0.65" : "+=0.35");
      });
      tl.to(q(".row-status")[1], { textContent: "agreed · ₹13,500 · Friday", duration: 0.1 });
      tl.call(() => states[3].classList.add("is-done"));

      // ---- 5 · Report ----------------------------------------------------
      tl.add(activate(4), "+=0.4");
      tl.call(() => { frame.dataset.island = "idle"; });
      tl.to(callRows[2], { autoAlpha: 1, duration: 0.25 });
      tl.to(q(".row-status")[2], { textContent: "declined · no availability", duration: 0.1 }, "<");
      tl.to(".demo-outcome", { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(2)" });
      tl.to({}, { duration: 2 });
      tl.to([".cap", ".brief-chip"], { autoAlpha: 0, duration: 0.5 });
    }, root);

    return () => {
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={root} className="relative">
      <div className="mb-10 max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rust">
          One delegated outcome, end to end
        </p>
        <h2 className="mt-2 text-4xl">Set the outcome. Watch Scout handle every call.</h2>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-charcoal/70">
          This example uses a PG search. The same workflow handles property, vendors, services,
          and client outreach: find the targets, call each one, negotiate, and return agreed terms.
        </p>
      </div>

      <div className="grid items-start gap-12 lg:grid-cols-[380px_1fr]">
        {/* ================= Phone ================= */}
        <div className="demo-phone relative mx-auto" data-speaker="scout">
          <IPhoneFrame
            height={688}
            island={
              <>
                <span className="di-avatar">
                  <Phone size={14} strokeWidth={2.4} />
                </span>
                <span>
                  <span className="di-label block">Comfort Stay PG</span>
                  <span className="di-sub block">Scout · calling for you</span>
                </span>
                <span className="di-wave" aria-hidden>
                  {[0.5, 0.9, 0.65, 1, 0.55].map((a, i) => (
                    <span key={i} style={{ "--amp": a, animationDelay: `${i * 0.11}s` } as React.CSSProperties} />
                  ))}
                </span>
                <span className="di-timer">00:00</span>
              </>
            }
          >
            {/* Screen A: intake with the user */}
            {/* Screen A: intake with a persistent voice-control zone. */}
            <div className="scr-intake demo-split-screen absolute inset-0" data-screen="intake">
              <div className="demo-split-upper">
                <div className="demo-call-header">
                  <div className="flex items-center gap-2.5">
                    <span className="demo-blob !h-9 !w-9" aria-hidden />
                    <div>
                      <p className="text-[15px] font-semibold text-ink">Voice brief with Scout</p>
                      <p className="text-[10px] uppercase tracking-wide text-secondary">
                        <span className="pulse mr-1 inline-block h-2 w-2 rounded-full bg-red align-middle" /> microphone active · live transcript
                      </p>
                    </div>
                  </div>
                  <span className="demo-role-label">VOICE CALL</span>
                </div>
                <p className="transcript-label">Live speech transcript</p>
                <div className="demo-transcript mt-1 flex-1 overflow-hidden">
                  {INTAKE.map((t, i) => <CapRow key={i} turn={t} cls={`cap-intake-${i}`} />)}
                  <div className="brief-chip card mx-auto mt-4 w-full max-w-[280px] px-4 py-3 text-left" style={{ opacity: 0 }}>
                    <div className="brief-chip-head"><p>Outcome confirmed</p><span>Ready</span></div>
                    <p className="brief-chip-title"><MapPin size={12} className="text-rust" /> 1-bed PG near Koramangala</p>
                    <p className="brief-chip-meta"><span>≤ ₹16k</span><span>Parking required</span><span>Negotiate rent</span></p>
                  </div>
                </div>
              </div>
              <div className="demo-split-divider" />
              <div className="demo-split-lower">
                <div className="demo-split-controls"><button type="button" aria-label="End preview">×</button><span>listening</span><button type="button" aria-label="Mute preview"><Mic size={15} /></button></div>
                <Waveform seed={37} />
                <p>Voice active · captions shown instead of audio</p>
              </div>
            </div>

            {/* Screen B: negotiation above, live voice controls below. */}
            <div className="scr-nego demo-split-screen absolute inset-0" data-screen="negotiation" style={{ opacity: 0 }}>
              <div className="demo-split-upper">
                <div className="demo-call-header">
                  <div>
                    <p className="text-[15px] font-semibold text-ink">Calling Comfort Stay PG</p>
                    <p className="text-[10px] uppercase tracking-wide text-secondary"><span className="pulse mr-1 inline-block h-2 w-2 rounded-full bg-red align-middle" /> target 2 of 14 · negotiating</p>
                  </div>
                  <span className="demo-role-label">LIVE CALL</span>
                </div>
                <p className="transcript-label">Live speech transcript</p>
                <div className="demo-transcript mt-1 flex-1 overflow-hidden">
                  {NEGOTIATION.map((t, i) => <CapRow key={i} turn={t} cls={`cap-nego-${i}`} />)}
                </div>
                <div className="demo-outcome mx-auto mb-2 w-full" style={{ opacity: 0 }}>
                  <div className="phone-agreement"><span>Agreed terms</span><strong>₹13,500 / month</strong><small>Available Aug 1 · held until Friday · transcript attached</small></div>
                </div>
              </div>
              <div className="demo-split-divider" />
              <div className="demo-split-lower">
                <div className="demo-split-controls"><button type="button" aria-label="End preview">×</button><span className="di-timer-inline">00:47</span><button type="button" aria-label="Mute preview"><Mic size={15} /></button></div>
                <Waveform seed={41} />
                <p>Live voice call · AI disclosed · transcript recording</p>
              </div>
            </div>
          </IPhoneFrame>
          <p className="mt-4 text-center text-[10px] uppercase tracking-wide text-secondary">
            Voice calls visualized with live captions · audio muted
          </p>
        </div>

        {/* ================= Pipeline ================= */}
        <div className="relative">
          <ScoutMascot className="pointer-events-none absolute -top-16 right-2 hidden w-28 rotate-6 lg:block" />
          <ol className="space-y-4">
            {/* 1 · Listen */}
            <li className="state-card card p-5">
              <StateHead icon={<Mic size={17} />} n="01" title="Set the outcome" tag="your instructions" />
              <p className="mt-2 text-sm text-charcoal/70">
                Scout confirms the goal, targets, questions, limits, timing, and what it may negotiate.
              </p>
            </li>

            {/* 2 · Search */}
            <li className="state-card card p-5">
              <StateHead icon={<MapPin size={17} />} n="02" title="Find relevant targets" tag="search & sources" />
              <div className="mt-3">
                <NeighborhoodMap className="h-52 w-full" />
                <p className="search-count mt-2 text-sm font-medium text-ink" />
              </div>
            </li>

            {/* 3 · Rank */}
            <li className="state-card card p-5">
              <StateHead icon={<Sparkles size={17} />} n="03" title="Qualify against the brief" tag="matching" />
              <div className="mt-3 space-y-2">
                {RANKED.map((r, i) => (
                  <div key={r.name} className="rank-row flex items-center justify-between rounded-xl bg-white/45 px-3.5 py-2">
                    <div className="flex items-center gap-2.5">
                      <span className="mono text-[11px] text-secondary">#{i + 1}</span>
                      <span className="text-sm font-medium text-ink">{r.name}</span>
                    </div>
                    <span className="flex items-center gap-1 text-[11px] text-secondary">
                      <Star size={10} className="text-amber" /> {r.meta}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-secondary">availability · price · fit · reputation · your constraints</p>
            </li>

            {/* 4 · Call */}
            <li className="state-card card p-5">
              <StateHead icon={<PhoneCall size={17} />} n="04" title="Call, follow up & negotiate" tag="voice agent" />
              <div className="mt-3 space-y-2">
                {["Sunrise Luxury PG", "Comfort Stay PG", "Zolo Nest PG"].map((name) => (
                  <div key={name} className="call-row flex items-center justify-between rounded-xl bg-white/45 px-3.5 py-2">
                    <span className="flex items-center gap-2.5 text-sm font-medium text-ink">
                      <Phone size={13} className="text-rust" /> {name}
                    </span>
                    <span className="row-status mono text-[11px] text-secondary">queued</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-secondary">
                Scout discloses it is AI, asks your questions consistently, follows up, and negotiates only within your limits.
              </p>
            </li>

            {/* 5 · Report */}
            <li className="state-card card p-5">
              <StateHead icon={<FileCheck2 size={17} />} n="05" title="Return agreed terms" tag="evidence" />
              <p className="mt-2 text-sm text-charcoal/70">
                See who accepted, declined, or added conditions, with the final price, next action,
                and transcript evidence for every target.
              </p>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function StateHead({
  icon,
  n,
  title,
  tag,
}: {
  icon: React.ReactNode;
  n: string;
  title: string;
  tag: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="call-idx !text-[26px]">{n}</span>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-rust/10 text-rust">{icon}</span>
        <h3 className="text-lg">{title}</h3>
      </div>
      <span className="state-source">{tag.toUpperCase()}</span>
    </div>
  );
}
