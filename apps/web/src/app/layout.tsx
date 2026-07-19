import type { Metadata } from "next";
import "./globals.css";
import { StageNav } from "@/components/StageNav";

export const metadata: Metadata = {
  title: "Scout | Your Outbound Deal Agent",
  description:
    "Set the outcome once. Scout finds the right targets, calls and negotiates on your behalf, then returns the agreed terms with evidence.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <StageNav />
        <main id="main-content" className="wrap py-10">{children}</main>
        <footer className="wrap pb-12 pt-4">
          <div className="wire mb-4" />
          <p className="text-[11px] leading-relaxed text-secondary">
            Scout identifies itself as AI on every call and cannot pay, sign, or make a binding
            commitment without approval. Every agreed term keeps its source and transcript attached.
          </p>
        </footer>
      </body>
    </html>
  );
}
