import type { Metadata } from "next";
import "./globals.css";
import { StageNav } from "@/components/StageNav";

export const metadata: Metadata = {
  title: "Scout — the Negotiator",
  description:
    "An autonomous buying agent that researches, negotiates, and learns from every deal.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Ink header strip: name + one subline only. */}
        <header style={{ background: "var(--ink)" }}>
          <div className="wrap flex items-baseline justify-between py-4">
            <a href="/" className="flex items-baseline gap-3">
              <span className="serif text-2xl font-semibold text-white">Scout</span>
              <span className="mono text-[11px] uppercase tracking-widest text-white/45">
                case file · negotiation
              </span>
            </a>
            <span className="mono hidden text-[11px] text-white/40 sm:block">
              moving pilot · AI buying agent
            </span>
          </div>
        </header>

        {/* Paper tab strip. */}
        <div style={{ background: "var(--paper-2)" }} className="border-b border-line">
          <div className="wrap">
            <StageNav />
          </div>
        </div>

        <main className="wrap py-10">{children}</main>

        <footer className="wrap pb-12 pt-4">
          <div className="wire mb-4" />
          <p className="mono text-[11px] leading-relaxed text-charcoal/55">
            Scout discloses it is an AI on every call and cannot pay, sign, or commit — terms are
            subject to your confirmation. Built for the ElevenLabs × Hack-Nation Negotiator
            challenge.
          </p>
        </footer>
      </body>
    </html>
  );
}
