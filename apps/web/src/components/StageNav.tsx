"use client";

import { usePathname } from "next/navigation";

const STAGES = [
  { n: "01", label: "INTAKE", href: "/intake", match: (p: string) => p.startsWith("/intake") },
  { n: "02", label: "DISCOVER", href: "/discover", match: (p: string) => p.startsWith("/discover") },
  { n: "03", label: "ENGINE", href: "/intelligence", match: (p: string) => p.startsWith("/intelligence") },
  { n: "04", label: "CALLS", href: "/calls", match: (p: string) => p.startsWith("/calls") },
  {
    n: "05",
    label: "REPORT",
    href: "/report/req_demo_koramangala_pg",
    match: (p: string) => p.startsWith("/report"),
  },
];

export function StageNav() {
  const pathname = usePathname() ?? "/";
  return (
    <nav>
      <ol className="flex items-center gap-6 overflow-x-auto">
        {STAGES.map((s) => {
          const active = s.match(pathname);
          return (
            <li key={s.n}>
              <a href={s.href} className="tab" data-active={active}>
                <span className="num">{s.n}</span>
                {s.label}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
