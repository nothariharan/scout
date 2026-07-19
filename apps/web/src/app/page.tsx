"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { ArrowRight, ArrowUpRight, Check, FileCheck2, PhoneCall, Search, ShieldCheck } from "lucide-react";
import { LiveCallDemo } from "@/components/LiveCallDemo";
import { ScoutHero } from "@/components/ScoutHero";
import { WorkflowShowcase } from "@/components/WorkflowShowcase";

export default function Home() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ duration: 1.05 });
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    const context = gsap.context(() => {
      gsap.from(".scout-main-copy > *", {
        y: 38,
        opacity: 0,
        duration: 0.85,
        ease: "power3.out",
        stagger: 0.1,
      });
      gsap.from(".hero-device", {
        x: 70,
        y: 30,
        opacity: 0,
        rotate: 4,
        duration: 1.1,
        delay: 0.25,
        ease: "power3.out",
      });
      gsap.from(".orbit-tile", {
        y: 55,
        opacity: 0,
        scale: 0.6,
        duration: 0.7,
        delay: 0.65,
        ease: "back.out(1.8)",
        stagger: 0.08,
      });
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
        gsap.from(element, {
          y: 54,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: { trigger: element, start: "top 86%" },
        });
      });
    }, root);

    return () => {
      context.revert();
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  return (
    <div ref={root} className="home-page">
      <ScoutHero />

      <section className="proof-strip" aria-label="Product capabilities">
        <p>EXAMPLE RUN · ONE OUTCOME IN, AGREED TERMS OUT</p>
        <div>
          <span><b>14</b> targets researched</span>
          <span><b>8</b> calls completed</span>
          <span><b>100%</b> terms traceable</span>
        </div>
      </section>


      <section id="product" className="product-section" data-reveal>
        <div className="section-heading split-heading">
          <div>
            <p className="section-label">LIVE PRODUCT WALKTHROUGH</p>
            <h2>See Scout handle a real task end to end.</h2>
          </div>
          <p>This PG search is one example. The same workflow handles property, vendors, services, and client outreach: every target, call, follow-up, negotiated term, and transcript stays visible.</p>
        </div>
        <LiveCallDemo />
      </section>

      <section id="how-it-works" className="how-section">
        <div className="section-heading" data-reveal>
          <p className="section-label">HOW IT WORKS</p>
          <h2>Three steps. Clear terms.</h2>
        </div>
        <ol className="how-grid">
          <li data-reveal>
            <div className="step-icon"><Search size={23} /><span>01</span></div>
            <h3>Describe the outcome</h3>
            <p>Talk or type once. Scout confirms your location, budget, timing, and hard constraints before it starts.</p>
          </li>
          <li data-reveal>
            <div className="step-icon"><PhoneCall size={23} /><span>02</span></div>
            <h3>Scout works the market</h3>
            <p>It finds the strongest options, calls them, asks the same critical questions, and negotiates with real leverage.</p>
          </li>
          <li data-reveal>
            <div className="step-icon"><FileCheck2 size={23} /><span>03</span></div>
            <h3>Review what they agreed</h3>
            <p>See every acceptance, decline, condition, price, transcript, and next action in one comparable report.</p>
          </li>
        </ol>
      </section>

      <div data-reveal><WorkflowShowcase /></div>

      <section id="safety" className="safety-section" data-reveal>
        <div className="safety-copy">
          <p className="section-label">TRUST IS PART OF THE PRODUCT</p>
          <h2>Persuasive, never deceptive.</h2>
          <p>Scout can negotiate and confirm provisional agreement, but it cannot invent a quote, pretend to be human, pay, sign, or make a binding commitment without your approval.</p>
          <a href="/intelligence" className="safety-link">See the decision engine <ArrowRight size={16} /></a>
        </div>
        <div className="safety-ledger">
          <p><span><Check size={15} /></span> Announces that it is an AI agent</p>
          <p><span><Check size={15} /></span> Uses only verified comparable quotes</p>
          <p><span><Check size={15} /></span> Stores the transcript behind each claim</p>
          <p><span><Check size={15} /></span> Leaves every final decision to you</p>
        </div>
      </section>

      <section className="final-cta" data-reveal>
        <p className="section-label">YOUR NEXT OUTCOME STARTS HERE</p>
        <h2>Set the outcome.<br />Stop making the calls.</h2>
        <div>
          <a href="/delegate" className="btn btn-large">Delegate a task <ArrowUpRight size={17} /></a>
          <a href="/report" className="btn-secondary btn-large">View a sample report</a>
        </div>
      </section>
    </div>
  );
}
