// Realistic iPhone chrome (Wispr-Flow-grade device mockup): titanium rail,
// bezel, status bar, Dynamic Island with a live-activity slot, home indicator.
// The island expands when the frame has data-island="live" (driven by GSAP in
// the caller) — collapsed it reads as the pill + camera, expanded it becomes a
// call activity with caller, mini waveform, and a timer.

import type { ReactNode } from "react";

interface IPhoneFrameProps {
  children: ReactNode;
  /** Expanded live-activity content shown when data-island="live". */
  island?: ReactNode;
  className?: string;
  height?: number;
}

function SignalIcon() {
  return (
    <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor" aria-hidden>
      <rect x="0" y="7" width="3" height="4" rx="0.8" />
      <rect x="4.5" y="5" width="3" height="6" rx="0.8" />
      <rect x="9" y="2.5" width="3" height="8.5" rx="0.8" />
      <rect x="13.5" y="0" width="3" height="11" rx="0.8" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor" aria-hidden>
      <path d="M8 9.2a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8z" transform="translate(0 -1.4)" />
      <path
        d="M8 5.4c1.5 0 2.86.58 3.88 1.53l-1.16 1.2A4.02 4.02 0 0 0 8 7.1c-1.03 0-1.97.39-2.72 1.03l-1.16-1.2A5.62 5.62 0 0 1 8 5.4z"
        opacity="0.95"
      />
      <path
        d="M8 2.2c2.38 0 4.55.9 6.19 2.38l-1.15 1.19A7.13 7.13 0 0 0 8 3.9c-1.94 0-3.7.77-5.04 2.02L1.81 4.58A8.73 8.73 0 0 1 8 2.2z"
        opacity="0.95"
      />
    </svg>
  );
}

function BatteryIcon() {
  return (
    <svg width="25" height="12" viewBox="0 0 25 12" aria-hidden>
      <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" fill="none" stroke="currentColor" opacity="0.4" />
      <rect x="2" y="2" width="15" height="8" rx="2" fill="currentColor" />
      <path d="M23 4v4c1-.35 1.6-1.1 1.6-2S24 4.35 23 4z" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

export function IPhoneFrame({ children, island, className = "", height = 600 }: IPhoneFrameProps) {
  return (
    <div className={`iphone ${className}`} data-island="idle">
      {/* Side hardware: action button, volume, power. */}
      <span className="iphone-btn iphone-btn-action" />
      <span className="iphone-btn iphone-btn-vol-up" />
      <span className="iphone-btn iphone-btn-vol-down" />
      <span className="iphone-btn iphone-btn-power" />

      <div className="iphone-screen" style={{ height }}>
        {/* Status bar. */}
        <div className="iphone-status">
          <span className="iphone-time">9:41</span>
          <span className="flex items-center gap-1.5">
            <SignalIcon />
            <WifiIcon />
            <BatteryIcon />
          </span>
        </div>

        {/* Dynamic Island: collapsed pill ⇄ expanded call live-activity. */}
        <div className="d-island">
          <span className="d-island-camera" />
          <div className="d-island-live">{island}</div>
        </div>

        {children}

        {/* Home indicator. */}
        <span className="iphone-home" />
      </div>
    </div>
  );
}
