// Flat spot illustrations for the guarantee tiles — same hand-drawn language as
// ScoutMascot (thick ink outlines, indigo/orange accents on pearl).
const ink = "#1e1e28";

export function ShieldSpot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path
        d="M32 6l20 8v14c0 13-8.5 22.5-20 28C20.5 50.5 12 41 12 28V14z"
        fill="#c9c7ff"
        stroke={ink}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path d="M22 31l7 7 13-13" fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LedgerSpot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect x="12" y="8" width="40" height="48" rx="6" fill="#ffd9c2" stroke={ink} strokeWidth="3.5" />
      <path d="M20 20h24M20 30h24M20 40h14" stroke={ink} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="44" cy="44" r="9" fill="#5e5ce6" stroke={ink} strokeWidth="3.5" />
      <path d="M40 44l3 3 5-5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ReceiptSpot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path
        d="M16 8h32v44l-5-4-6 4-5-4-6 4-5-4-5 4z"
        fill="#fff"
        stroke={ink}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path d="M24 20h16M24 28h16M24 36h9" stroke={ink} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M40 34l7 7" stroke="#ff8a5c" strokeWidth="4" strokeLinecap="round" />
      <circle cx="45" cy="39" r="7" fill="none" stroke="#5e5ce6" strokeWidth="3.5" />
    </svg>
  );
}
