"use client";

// Real map (Leaflet + OpenStreetMap tiles — no API key), tinted to the pearl/
// indigo theme via CSS filter. Markers are liquid-glass price chips; the center
// star is the user's target area. Loaded client-side only (leaflet needs window).

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type MapSpot = {
  lat: number;
  lng: number;
  label: string;
  kind?: "target" | "place";
};

const KORAMANGALA: MapSpot[] = [
  { lat: 12.9352, lng: 77.6245, label: "You", kind: "target" },
  { lat: 12.9382, lng: 77.6186, label: "Comfort Stay", kind: "place" },
  { lat: 12.9331, lng: 77.63, label: "Zolo Nest", kind: "place" },
  { lat: 12.9297, lng: 77.6221, label: "Sunrise PG", kind: "place" },
  { lat: 12.9401, lng: 77.6282, label: "₹14.2k", kind: "place" },
  { lat: 12.9315, lng: 77.6169, label: "₹15.5k", kind: "place" },
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

  return <div ref={el} className={`map-tint ${className ?? ""}`} />;
}
