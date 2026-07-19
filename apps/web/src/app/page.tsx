"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

const STEPS = [
  { n: "01", title: "Confirm one requirement", fact: "Voice or document. Reused verbatim on every call." },
  { n: "02", title: "Discover & geofence", fact: "Filtered by radius and commute time before any call goes out." },
  { n: "03", title: "Decide the next move", fact: "Strategy is calculated from market truth, history, and verified leverage." },
  { n: "04", title: "Call & negotiate", fact: "The voice agent verbalizes the strategy; it does not invent one." },
  { n: "05", title: "Recommend & learn", fact: "Every outcome improves vendor and market intelligence." },
];

const PROMISES = [
  "Discloses it's an AI on every call",
  "Never invents a bid",
  "Every call ends structured",
  "Cites only verified leverage",
  "Cannot pay, sign, or commit",
  "Transcripts for every claim",
];

export default function Home() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ duration: 1.15 });
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    const ctx = gsap.context(() => {
      // Hero entrance: words surface like breaking through water.
      gsap.from(".hero-word", {
        yPercent: 120,
        opacity: 0,
        duration: 1.1,
        ease: "power4.out",
        stagger: 0.09,
      });
      gsap.from(".hero-soft", {
        y: 26,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        delay: 0.55,
        stagger: 0.12,
      });
      gsap.from(".hero-card", {
        y: 70,
        opacity: 0,
        rotate: 3,
        duration: 1.2,
        ease: "power3.out",
        delay: 0.35,
      });
      // Ambient float + scroll parallax on the teaser card.
      gsap.to(".hero-card", { y: -14, duration: 3.2, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.to(".hero-card", {
        yPercent: -24,
        ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
      });

      // Step panels rise in as they enter.
      gsap.utils.toArray<HTMLElement>(".step-panel").forEach((panel) => {
        gsap.from(panel, {
          y: 90,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: panel, start: "top 82%" },
        });
      });

      // Engine spotlight surfaces from the deep.
      gsap.from(".engine-panel", {
        scale: 0.94,
        y: 60,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: ".engine-panel", start: "top 78%" },
      });

      // Guarantee tiles pop with stagger.
      gsap.from(".vow", {
        y: 50,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: { trigger: ".vows", start: "top 80%" },
      });

      // Final CTA.
      gsap.from(".cta-panel", {
        y: 60,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: ".cta-panel", start: "top 85%" },
      });
    }, root);

    return () => {
      ctx.revert();
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  return (
    <div ref={root} className="space-y-24 pb-8">
      {/* ---- Hero ---------------------------------------------------------- */}
      <section className="hero relative flex min-h-[86svh] flex-col justify-center">
        <div className="max-w-3xl">
          <p className="hero-soft mb-5">
            <span className="pill">SCOUT · THE AI BUYING AGENT</span>
          </p>
          <h1 className="text-5xl leading-[1.04] sm:text-7xl">
            <span className="block overflow-hidden pb-1">
              <span className="hero-word inline-block">Never</span>{" "}
              <span className="hero-word inline-block">overpay.</span>
            </span>
            <span className="block overflow-hidden pb-2">
              <span className="hero-word inline-block">Ever</span>{" "}
              <span className="hero-word inline-block">again.</span>
            </span>
          </h1>
          <p className="hero-soft mt-6 max-w-xl text-lg leading-relaxed text-charcoal/80">
            Scout researches a market, calls every business in parallel, negotiates with verified
            leverage, and hands you an evidence-backed decision. Moving companies first — the
            engine is built to travel.
          </p>
          <div className="hero-soft mt-8 flex flex-wrap gap-3">
            <a href="/moving" className="btn">
              START INTAKE →
            </a>
            <a href="/moving/report" className="btn-ghost">
              SEE A REPORT
            </a>
          </div>
        </div>

        {/* Floating proof-of-outcome teaser. */}
        <aside className="hero-card card absolute right-0 top-[16%] hidden w-[300px] p-5 lg:block">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-secondary">
            Live negotiation
          </p>
          <p className="mt-2 text-sm font-medium text-ink">Northline Moving</p>
          <p className="mono mt-3 text-[26px] font-semibold text-ink">
            $2,050 <span className="text-sage">→ $1,850</span>
          </p>
          <p className="mt-1 text-xs text-charcoal/65">
            after citing a verified comparable quote
          </p>
          <div className="wire my-4" />
          <div className="flex items-center gap-2">
            <span className="pill pill-sage">VERIFIED</span>
            <span className="pill">TRANSCRIPT ATTACHED</span>
          </div>
        </aside>

        <p className="hero-soft absolute bottom-4 left-0 text-[11px] tracking-wide text-secondary">
          Scroll ↓
        </p>
      </section>

      {/* ---- Honesty marquee ---------------------------------------------- */}
      <section className="card overflow-hidden py-4">
        <div className="marquee-track">
          {[...PROMISES, ...PROMISES].map((p, i) => (
            <span key={i} className="flex shrink-0 items-center gap-3 text-sm text-charcoal/75">
              <span className="text-rust">✦</span>
              {p}
            </span>
          ))}
        </div>
      </section>

      {/* ---- How it works -------------------------------------------------- */}
      <section>
        <div className="mb-10 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rust">
            How Scout works
          </p>
          <h2 className="mt-2 text-4xl">One brief. Every call. Zero repetition.</h2>
        </div>
        <ol className="space-y-5">
          {STEPS.map((s) => (
            <li key={s.n} className="step-panel card flex items-center gap-7 p-6 sm:p-7">
              <span className="call-idx w-16 shrink-0">{s.n}</span>
              <div>
                <h3 className="text-2xl">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-charcoal/70">{s.fact}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ---- Engine spotlight ---------------------------------------------- */}
      <section>
        <div className="engine-panel glass-deep p-7 text-white sm:p-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
            The negotiation engine
          </p>
          <h2 className="mt-3 max-w-2xl text-4xl text-white sm:text-5xl">
            The model speaks. The engine decides.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/75">
            Market benchmarks, vendor history, conversation climate, and only-verified leverage —
            computed before the voice agent says a word.
          </p>
          <div className="mt-7 rounded-xl border-l-2 border-rust bg-white/5 p-5">
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">
              Voice agent may say
            </p>
            <p className="mt-2 text-xl leading-relaxed text-white">
              “We have a verified comparable quote around $1,900 — is there any flexibility?”
            </p>
          </div>
          <a href="/intelligence" className="btn mt-8 inline-flex">
            WATCH IT DECIDE →
          </a>
        </div>
      </section>

      {/* ---- Guarantees ----------------------------------------------------- */}
      <section className="vows">
        <div className="mb-10 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rust">
            Non-negotiables
          </p>
          <h2 className="mt-2 text-4xl">Honesty is the strategy.</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <div className="vow card p-6">
            <p className="mono text-5xl font-light text-ink">0</p>
            <h3 className="mt-3 text-xl">Invented bids</h3>
            <p className="mt-1.5 text-sm text-charcoal/70">
              Leverage comes only from confirmed quotes and real benchmarks.
            </p>
          </div>
          <div className="vow card p-6">
            <p className="mono text-5xl font-light text-ink">3</p>
            <h3 className="mt-3 text-xl">Structured endings</h3>
            <p className="mt-1.5 text-sm text-charcoal/70">
              Itemized quote, scheduled callback, or documented decline — nothing vague.
            </p>
          </div>
          <div className="vow card p-6">
            <p className="mono text-5xl font-light text-ink">100%</p>
            <h3 className="mt-3 text-xl">Evidence-backed</h3>
            <p className="mt-1.5 text-sm text-charcoal/70">
              Every recommendation cites the transcript line it stands on.
            </p>
          </div>
        </div>
      </section>

      {/* ---- Final CTA ------------------------------------------------------ */}
      <section>
        <div className="cta-panel card flex flex-col items-center gap-6 p-10 text-center sm:p-14">
          <h2 className="max-w-xl text-4xl sm:text-5xl">Let Scout make the calls.</h2>
          <p className="max-w-md text-sm leading-relaxed text-charcoal/70">
            Describe the job once. Scout phones the market, haggles honestly, and reports back
            with proof.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="/moving" className="btn">
              START INTAKE →
            </a>
            <a href="/calls" className="btn-ghost">
              WATCH LIVE CALLS
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
