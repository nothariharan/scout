"use client";

import { useMemo, useState } from "react";
import { DEMO_CANDIDATES, DEMO_REQUIREMENT } from "@/lib/demo-data";
import { MapPanel } from "@/components/MapPanel";
import { inr } from "@/lib/format";

export default function DiscoverPage() {
  const spec = DEMO_REQUIREMENT.spec;
  const maxCommute = spec.commute_constraint?.max_minutes ?? Infinity;

  const inScope = useMemo(
    () => DEMO_CANDIDATES.filter((c) => (c.commute_minutes ?? 0) <= maxCommute),
    [maxCommute]
  );
  const outOfScope = DEMO_CANDIDATES.filter((c) => (c.commute_minutes ?? 0) > maxCommute);

  const [selected, setSelected] = useState<Set<string>>(() => new Set(inScope.map((c) => c.listing_id)));
  const [activeId, setActiveId] = useState<string | undefined>(inScope[0]?.listing_id);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">Discover &amp; geofence</h1>
          <p className="mt-1 text-sm text-charcoal/70">
            Filtered by radius and commute time before any call goes out.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="pill">{selected.size} SELECTED</span>
          <a href="/calls" aria-disabled={selected.size === 0}
            className={`btn ${selected.size ? "" : "pointer-events-none opacity-40"}`}>
            DISPATCH →
          </a>
        </div>
      </header>

      <div className="wire" />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <ol>
          {inScope.map((c, i) => {
            const on = selected.has(c.listing_id);
            return (
              <li key={c.listing_id}>
                <div
                  onMouseEnter={() => setActiveId(c.listing_id)}
                  className="flex items-start gap-4 py-4"
                  style={{ opacity: on ? 1 : 0.5 }}
                >
                  <span className="call-idx w-10 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-ink">{c.listing_name}</div>
                        <div className="mono mt-0.5 text-[11px] text-charcoal/55">
                          {c.source} · {c.distance_km} km · {c.commute_minutes} min
                        </div>
                      </div>
                      <label className="mono flex cursor-pointer items-center gap-2 text-[11px] text-charcoal/60">
                        <input type="checkbox" checked={on} onChange={() => toggle(c.listing_id)}
                          style={{ accentColor: "var(--rust)" }} className="h-4 w-4" />
                        {on ? "WILL CALL" : "SKIPPED"}
                      </label>
                    </div>
                    <div className="mono mt-2 text-sm">
                      <span className="text-charcoal/55">advertised </span>
                      <span className="text-ink">{inr(c.advertised_rent)}</span>
                      <span className="ml-2 text-[11px] text-charcoal/45">headline only</span>
                    </div>
                  </div>
                </div>
                <div className="wire" />
              </li>
            );
          })}

          {outOfScope.length > 0 && (
            <li className="mono py-4 text-[11px] text-charcoal/50">
              {outOfScope.length} excluded over the {maxCommute}-min commute cap — before dispatch, not after.
            </li>
          )}
        </ol>

        <div className="h-[360px]">
          <MapPanel spec={spec} candidates={inScope} selectedIds={selected} activeId={activeId} />
        </div>
      </div>
    </div>
  );
}
