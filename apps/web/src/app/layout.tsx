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
        {/* Frosted, translucent chrome: brand row + stage tabs over one blur. */}
        <div
          className="sticky top-0 z-40 border-b border-line"
          style={{
            background: "rgba(251, 251, 253, 0.8)",
            backdropFilter: "saturate(180%) blur(20px)",
            WebkitBackdropFilter: "saturate(180%) blur(20px)",
          }}
        >
          <header>
            <div className="wrap flex items-baseline justify-between py-3">
              <a href="/" className="flex items-baseline gap-3">
                <span className="text-xl font-semibold tracking-tight text-ink">Scout</span>
                <span className="text-[11px] font-medium text-secondary">
                  Case file · Negotiation
                </span>
              </a>
              <span className="hidden text-[11px] text-secondary sm:block">
                Moving pilot · AI buying agent
              </span>
            </div>
          </header>
          <div className="wrap">
            <StageNav />
          </div>
        </div>

        <main className="wrap py-10">{children}</main>

        <footer className="wrap pb-12 pt-4">
          <div className="wire mb-4" />
          <p className="text-[11px] leading-relaxed text-secondary">
            Scout discloses it is an AI on every call and cannot pay, sign, or commit — terms are
            subject to your confirmation. Built for the ElevenLabs × Hack-Nation Negotiator
            challenge.
          </p>
        </footer>
      </body>
    </html>
  );
}
