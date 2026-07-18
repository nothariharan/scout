import type { CandidateListing, RequirementSpec } from "@/lib/types";

// SVG map placeholder in the paper/ink palette. Projects lat/lng so relative
// positions are honest; the live app swaps this for a tile layer (same props).
export function MapPanel({
  spec,
  candidates,
  selectedIds,
  activeId,
}: {
  spec: RequirementSpec;
  candidates: CandidateListing[];
  selectedIds: Set<string>;
  activeId?: string;
}) {
  const pts = candidates
    .filter((c) => c.lat != null && c.lng != null)
    .map((c) => ({ ...c, lat: c.lat as number, lng: c.lng as number }));

  const anchor = spec.commute_constraint
    ? { lat: spec.commute_constraint.reference_point_lat, lng: spec.commute_constraint.reference_point_lng }
    : null;
  const target =
    spec.location.lat != null && spec.location.lng != null
      ? { lat: spec.location.lat, lng: spec.location.lng }
      : null;

  const lats = [...pts.map((p) => p.lat), anchor?.lat, target?.lat].filter(
    (n): n is number => n != null
  );
  const lngs = [...pts.map((p) => p.lng), anchor?.lng, target?.lng].filter(
    (n): n is number => n != null
  );
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const pad = 42;
  const W = 520;
  const H = 340;

  const x = (lng: number) =>
    maxLng === minLng ? W / 2 : pad + ((lng - minLng) / (maxLng - minLng)) * (W - 2 * pad);
  const y = (lat: number) =>
    maxLat === minLat ? H / 2 : H - pad - ((lat - minLat) / (maxLat - minLat)) * (H - 2 * pad);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="card h-full w-full"
      style={{ background: "var(--paper-2)" }}
      role="img"
      aria-label="Map of candidate listings relative to the target area and commute anchor"
    >
      <defs>
        <pattern id="grid" width="26" height="26" patternUnits="userSpaceOnUse">
          <path d="M 26 0 L 0 0 0 26" fill="none" stroke="#d8cfbb" strokeWidth="1" opacity="0.6" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#grid)" />

      {anchor &&
        pts.map((p) => (
          <line
            key={`l-${p.listing_id}`}
            x1={x(anchor.lng)}
            y1={y(anchor.lat)}
            x2={x(p.lng)}
            y2={y(p.lat)}
            stroke="#d8cfbb"
            strokeWidth="1"
            strokeDasharray="3 4"
            opacity={selectedIds.has(p.listing_id) ? 0.9 : 0.4}
          />
        ))}

      {target && (
        <g>
          <circle cx={x(target.lng)} cy={y(target.lat)} r="7" fill="none" stroke="#16233d" strokeWidth="2" />
          <text
            x={x(target.lng) + 11}
            y={y(target.lat) + 4}
            fontFamily="IBM Plex Mono, monospace"
            fontSize="10"
            fill="#16233d"
          >
            {spec.location.area}
          </text>
        </g>
      )}

      {anchor && (
        <g>
          <rect x={x(anchor.lng) - 5} y={y(anchor.lat) - 5} width="10" height="10" fill="#b4791f" />
          <text
            x={x(anchor.lng) + 10}
            y={y(anchor.lat) + 4}
            fontFamily="IBM Plex Mono, monospace"
            fontSize="10"
            fill="#b4791f"
          >
            anchor
          </text>
        </g>
      )}

      {pts.map((p) => {
        const selected = selectedIds.has(p.listing_id);
        const active = p.listing_id === activeId;
        return (
          <g key={p.listing_id} opacity={selected ? 1 : 0.4}>
            <circle
              cx={x(p.lng)}
              cy={y(p.lat)}
              r={active ? 8 : 6}
              fill={selected ? "#b0451f" : "#c9bfa8"}
              stroke={active ? "#16233d" : "transparent"}
              strokeWidth="2"
            />
            {p.commute_minutes != null && (
              <text
                x={x(p.lng) + 10}
                y={y(p.lat) + 4}
                fontFamily="IBM Plex Mono, monospace"
                fontSize="10"
                fill="#2b2b28"
              >
                {p.commute_minutes}m
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
