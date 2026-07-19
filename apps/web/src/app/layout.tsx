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
        {/* Refraction filter for the liquid-glass surfaces (defined once). */}
        <svg xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", width: 0, height: 0 }} aria-hidden>
          <defs>
            <filter
              id="lg-dist"
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
              filterUnits="objectBoundingBox"
              primitiveUnits="userSpaceOnUse"
              colorInterpolationFilters="linearRGB"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.008 0.008"
                numOctaves="2"
                seed="92"
                stitchTiles="stitch"
                result="noise"
              />
              <feGaussianBlur in="noise" stdDeviation="2" result="blurred" />
              <feDisplacementMap
                in="SourceGraphic"
                in2="blurred"
                scale="70"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>

        {/* Floating liquid-glass menu capsule: brand row + stage tabs. */}
        <div className="sticky top-3 z-40 px-3">
          <div
            className="lg-container mx-auto max-w-[996px]"
            style={{
              borderRadius: 9999,
              boxShadow: "0 14px 44px rgba(24, 70, 110, 0.2)",
            }}
          >
            <div className="lg-filter" />
            <div className="lg-overlay" />
            <div className="lg-specular" />
            <div className="lg-content px-7">
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
