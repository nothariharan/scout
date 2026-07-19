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
        {/* Floating glass menu bar: brand row + stage tabs in one window. */}
        <div className="sticky top-3 z-40 px-3">
          <div
            className="mx-auto max-w-[996px] rounded-2xl border px-3"
            style={{
              background: "rgba(255, 255, 255, 0.55)",
              borderColor: "rgba(255, 255, 255, 0.8)",
              backdropFilter: "saturate(180%) blur(24px)",
              WebkitBackdropFilter: "saturate(180%) blur(24px)",
              boxShadow:
                "0 12px 40px rgba(24, 70, 110, 0.18), inset 0 1px 0 rgba(255,255,255,0.9)",
            }}
          >
            <header>
              <div className="flex items-baseline justify-between px-2 pb-1 pt-3">
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
            <div className="px-1 pb-2">
              <StageNav />
            </div>
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
