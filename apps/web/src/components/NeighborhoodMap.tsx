"use client";

// Real map (Leaflet + OpenStreetMap tiles — no API key), tinted to the pearl/
// indigo theme via CSS filter. Markers map directly to the ranked result list;
// pricing stays in result rows where its units and status are unambiguous.

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type MapSpot = {
  lat: number;
  lng: number;
  label: string;
  kind?: "target" | "place";
};

const KORAMANGALA: MapSpot[] = [
  { lat: 12.9352, lng: 77.6245, label: "Search area", kind: "target" },
  { lat: 12.9382, lng: 77.6186, label: "1", kind: "place" },
  { lat: 12.9331, lng: 77.63, label: "2", kind: "place" },
  { lat: 12.9297, lng: 77.6221, label: "3", kind: "place" },
];

export function NeighborhoodMap({
  spots = KORAMANGALA,
  className,
}: {
  spots?: MapSpot[];
  className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let cancelled = false;

    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current || el.current.dataset.mounted) return;
      el.current.dataset.mounted = "1";

      const target = spots.find((s) => s.kind === "target") ?? spots[0];
      map = L.map(el.current, {
        zoomControl: false,
        attributionControl: true,
        scrollWheelZoom: false,
        dragging: true,
      }).setView([target.lat, target.lng], 14);

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      L.circle([target.lat, target.lng], {
        radius: 900,
        color: "#5e5ce6",
        weight: 1.5,
        dashArray: "6 7",
        fillColor: "#5e5ce6",
        fillOpacity: 0.06,
        interactive: false,
      }).addTo(map);

      spots.forEach((s, i) => {
        const cls = s.kind === "target" ? "lmk lmk-target" : "lmk";
        L.marker([s.lat, s.lng], {
          icon: L.divIcon({
            className: "lmk-wrap",
            html: `<span class="${cls}" style="animation-delay:${i * 0.12}s">${s.label}</span>`,
            iconSize: [0, 0],
          }),
        }).addTo(map!);
      });
    })();

    return () => {
      cancelled = true;
      map?.remove();
      if (el.current) delete el.current.dataset.mounted;
    };
  }, [spots]);

  return <div ref={el} role="img" aria-label="Example Koramangala search area with three ranked PG results" className={`map-tint ${className ?? ""}`} />;
}
