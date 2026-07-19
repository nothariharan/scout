// Flat "Scout with binoculars" mascot, drawn in the site palette (Wispr-style
// spot illustration, vector so it stays crisp on the pearl backdrop).
export function ScoutMascot({ className }: { className?: string }) {
  const ink = "#1e1e28";
  return (
    <svg viewBox="0 0 220 200" className={className} aria-hidden>
      {/* body / sweater */}
      <path
        d="M60 200 v-52 c0-26 22-42 50-42 s50 16 50 42 v52 z"
        fill="#5e5ce6"
        stroke={ink}
        strokeWidth="5"
      />
      {/* collar */}
      <path d="M88 112 q22 14 44 0" fill="none" stroke={ink} strokeWidth="5" />
      {/* head */}
      <circle cx="110" cy="64" r="44" fill="#ffd9c2" stroke={ink} strokeWidth="5" />
      {/* hair swoosh */}
      <path
        d="M70 52 q6-34 44-32 q34 2 40 28 q-20-12-42-8 q6 8 4 16 q-16-14-46-4z"
        fill="#ff8a5c"
        stroke={ink}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      {/* binoculars */}
      <g stroke={ink} strokeWidth="5">
        <circle cx="88" cy="66" r="17" fill="#fff" />
        <circle cx="132" cy="66" r="17" fill="#fff" />
        <rect x="103" y="60" width="14" height="12" rx="4" fill="#c9c7ff" />
        <circle cx="88" cy="66" r="7" fill="#b9e6ff" />
        <circle cx="132" cy="66" r="7" fill="#b9e6ff" />
      </g>
      {/* hands holding binoculars */}
      <circle cx="70" cy="78" r="10" fill="#ffd9c2" stroke={ink} strokeWidth="5" />
      <circle cx="150" cy="78" r="10" fill="#ffd9c2" stroke={ink} strokeWidth="5" />
      {/* smile */}
      <path d="M100 94 q10 8 20 0" fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round" />
      {/* little signal sparks */}
      <g stroke="#5e5ce6" strokeWidth="5" strokeLinecap="round">
        <path d="M36 40 l-10 -8" />
        <path d="M40 26 l-6 -12" />
        <path d="M184 40 l10 -8" />
        <path d="M180 26 l6 -12" />
      </g>
    </svg>
  );
}
