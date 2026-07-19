"use client";

// Wispr-Flow-style device demo: a phone answers a negotiation call, the voice
// is shown as an animated waveform with live captions (readable without
// audio), and an agentic activity feed narrates what Scout is doing beneath.
// SIMULATED: scripted from a golden call — clearly labeled in the UI.

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type Turn = {
  speaker: "seller" | "scout";
  text: string;
  feed: string;
  feedTag?: "ok" | "flag";
};

const TURNS: Turn[] = [
  { speaker: "seller", text: "Summit Moving, how can I help?", feed: "Call connected · consented test line" },
  { speaker: "scout", text: "Hi! I'm Scout, an AI agent calling for a client's July 20 move.", feed: "AI disclosure given · brief reused verbatim" },
  { speaker: "seller", text: "One-bed with packing… that'd be $2,050 all-in.", feed: "Quote logged · fees itemized ($2,050)" },
  { speaker: "scout", text: "We hold a verified quote at $1,900 — any flexibility?", feed: "Leverage check → comparable $1,900 (verified)", feedTag: "ok" },
  { speaker: "seller", text: "…I can do $1,850 if you book this week.", feed: "Price drop captured · $2,050 → $1,850", feedTag: "ok" },
  { speaker: "scout", text: "I'll bring that to my client for confirmation — thank you!", feed: "Structured outcome · itemized quote ✓", feedTag: "ok" },
];

const BARS = 26;

export function LiveCallDemo() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context((self) => {
      const captions = gsap.utils.toArray<HTMLElement>(".demo-caption");
      const feedItems = gsap.utils.toArray<HTMLElement>(".demo-feed-item");
      const phone = self.selector!(".demo-phone")[0] as HTMLElement;

      const tl = gsap.timeline({
        repeat: -1,
        repeatDelay: 1.4,
        scrollTrigger: { trigger: phone, start: "top 85%", toggleActions: "play pause resume pause" },
      });

      // Reset everything at loop start.
      tl.set(".demo-incoming", { autoAlpha: 1 });
      tl.set(".demo-live", { autoAlpha: 0 });
      tl.set(captions, { autoAlpha: 0, y: 14 });
      tl.set(feedItems, { autoAlpha: 0, x: -14 });
      tl.set(".demo-outcome", { autoAlpha: 0, scale: 0.8 });

      // Ring… then answer.
      tl.to(".demo-answer", { scale: 1.12, duration: 0.32, yoyo: true, repeat: 3, ease: "sine.inOut" });
      tl.to(".demo-incoming", { autoAlpha: 0, duration: 0.45, ease: "power2.inOut" }, "+=0.2");
      tl.to(".demo-live", { autoAlpha: 1, duration: 0.45 }, "<");

      // Conversation: captions + synced agent feed.
      TURNS.forEach((turn, i) => {
        tl.call(() => {
          phone.dataset.speaker = turn.speaker;
        });
        tl.to(captions[i], { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" }, i === 0 ? "+=0.3" : "+=0.9");
        tl.to(feedItems[i], { autoAlpha: 1, x: 0, duration: 0.45, ease: "power2.out" }, "<+0.25");
        if (i > 0) tl.to(captions[i - 1], { autoAlpha: 0.35, duration: 0.4 }, "<");
      });

      // Outcome stamp.
      tl.to(".demo-outcome", { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(2)" }, "+=0.6");
      tl.to({}, { duration: 1.6 });
      // Fade feed for the next loop.
      tl.to([captions, feedItems], { autoAlpha: 0, duration: 0.6 });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="grid items-start gap-10 lg:grid-cols-[1fr_340px]">
      {/* ---- Copy + agentic feed ---- */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rust">
          Watch a call, read the deal
        </p>
        <h2 className="mt-2 max-w-xl text-4xl">
          Scout on the line. You in the loop.
        </h2>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-charcoal/70">
          Every call is captioned live so you can follow the negotiation without audio — while
          the agent narrates each move it makes underneath.
        </p>

        {/* Agent presence: morphing blob + activity feed. */}
        <div className="card mt-8 p-5">
          <div className="flex items-center gap-3">
            <span className="demo-blob" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-ink">Scout is working</p>
              <p className="text-[11px] text-secondary">agentic activity · simulated demo</p>
            </div>
          </div>
          <ol className="mt-5 space-y-2.5">
            {TURNS.map((t, i) => (
              <li key={i} className="demo-feed-item flex items-start gap-2.5 text-sm text-charcoal/80">
                <span className={t.feedTag === "ok" ? "mt-0.5 text-sage" : "mt-0.5 text-rust"}>
                  {t.feedTag === "ok" ? "✓" : "›"}
                </span>
                {t.feed}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* ---- Phone ---- */}
      <div className="demo-phone relative mx-auto w-[300px]" data-speaker="seller">
        <div className="card overflow-hidden rounded-[44px] p-0" style={{ height: 600 }}>
          {/* Notch */}
          <div className="absolute left-1/2 top-3 z-20 h-6 w-28 -translate-x-1/2 rounded-full bg-ink/90" />

          {/* Incoming-call layer */}
          <div className="demo-incoming absolute inset-0 z-10 flex flex-col items-center justify-between rounded-[44px] bg-white/35 px-6 pb-8 pt-20 backdrop-blur-md">
            <div className="text-center">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-rust/15 text-2xl">
                🚚
              </div>
              <p className="mt-4 text-lg font-semibold text-ink">Summit Moving Co.</p>
              <p className="mt-1 text-[12px] text-secondary">Scout is calling · moving quote</p>
            </div>
            <div className="flex w-full items-center justify-center gap-14">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-red/90 text-xl text-white">
                ✕
              </span>
              <span className="demo-answer grid h-14 w-14 place-items-center rounded-full text-xl text-white" style={{ background: "#34c759" }}>
                ✓
              </span>
            </div>
          </div>

          {/* Live-call layer */}
          <div className="demo-live absolute inset-0 flex flex-col rounded-[44px] px-5 pb-6 pt-16" style={{ opacity: 0 }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">Summit Moving Co.</p>
                <p className="text-[10px] uppercase tracking-wide text-secondary">
                  <span className="pulse mr-1 inline-block h-2 w-2 rounded-full bg-red align-middle" />
                  live · captioned
                </p>
              </div>
              <span className="pill">SCOUT</span>
            </div>

            {/* Waveform */}
            <div className="demo-wave mt-6 flex h-16 items-center justify-center gap-[3px]">
              {Array.from({ length: BARS }).map((_, i) => (
                <span
                  key={i}
                  className="wavebar"
                  style={{
                    animationDelay: `${(i % 7) * 0.09}s`,
                    animationDuration: `${0.7 + ((i * 37) % 40) / 100}s`,
                  }}
                />
              ))}
            </div>

            {/* Captions */}
            <div className="mt-5 flex-1 space-y-2.5 overflow-hidden">
              {TURNS.map((t, i) => (
                <p
                  key={i}
                  className={`demo-caption max-w-[92%] rounded-2xl px-3.5 py-2 text-[12.5px] leading-snug ${
                    t.speaker === "scout"
                      ? "ml-auto bg-rust/90 text-white"
                      : "bg-white/60 text-ink"
                  }`}
                  style={{ opacity: 0 }}
                >
                  {t.text}
                </p>
              ))}
            </div>

            {/* Outcome stamp */}
            <div className="demo-outcome mx-auto mb-1" style={{ opacity: 0 }}>
              <span className="rec-stamp">Itemized quote · saved $200</span>
            </div>
          </div>
        </div>
        <p className="mt-3 text-center text-[10px] uppercase tracking-wide text-secondary">
          Simulated demo — scripted from a golden call
        </p>
      </div>
    </div>
  );
}
