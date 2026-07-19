"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";

const STAGES = [
  { n: "1", label: "Outcome", href: "/delegate", match: (path: string) => path === "/delegate" || path === "/real-estate" || path.startsWith("/intake") },
  { n: "2", label: "Targets", href: "/discover", match: (path: string) => path.startsWith("/discover") || path.startsWith("/intelligence") },
  { n: "3", label: "Conversations", href: "/calls", match: (path: string) => path.startsWith("/calls") },
  { n: "4", label: "Results", href: "/report", match: (path: string) => path.startsWith("/report") || path.startsWith("/moving/report") },
];

export function StageNav() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const isHome = pathname === "/";

  return (
    <>
      <header className={isHome ? "site-header site-header-home" : "site-header"}>
        <div className="nav-shell">
          <a href="/" className="brand" aria-label="Scout home">
            <span className="brand-mark" aria-hidden>S</span>
            <span>Scout</span>
          </a>

          <nav className="desktop-nav" aria-label="Primary navigation">
            <a href="/#product">Product</a>
            <a href="/#how-it-works">How it works</a>
            <a href="/#use-cases">Use cases</a>
            <a href="/#safety">Safety</a>
          </nav>

          <div className="nav-actions">
            <a href="/report" className="nav-report">View results</a>
            <a href="/delegate" className="nav-cta">
              Tell Scout what you need <ArrowUpRight size={15} />
            </a>
            <button
              type="button"
              className="menu-button"
              aria-label={open ? "Close navigation" : "Open navigation"}
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {open && (
          <nav className="mobile-menu" aria-label="Mobile navigation">
            <a href="/#product" onClick={() => setOpen(false)}>Product</a>
            <a href="/#how-it-works" onClick={() => setOpen(false)}>How it works</a>
            <a href="/#use-cases" onClick={() => setOpen(false)}>Use cases</a>
            <a href="/#safety" onClick={() => setOpen(false)}>Safety</a>
            <a href="/report" onClick={() => setOpen(false)}>View sample results</a>
            <a href="/delegate" className="mobile-menu-cta">Tell Scout what you need</a>
          </nav>
        )}
      </header>

      {!isHome && (
        <nav className="flow-nav" aria-label="Delegation progress">
          <ol>
            {STAGES.map((stage) => {
              const active = stage.match(pathname);
              return (
                <li key={stage.n}>
                  <a href={stage.href} data-active={active} aria-current={active ? "step" : undefined}>
                    <span>{stage.n}</span>
                    {stage.label}
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>
      )}
    </>
  );
}
