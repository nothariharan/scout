import type { TranscriptLine } from "@/lib/types";

const TAG_CLASS: Record<NonNullable<TranscriptLine["tag"]>, string> = {
  disclosure: "pill pill-sage",
  leverage: "pill",
  concession: "pill pill-sage",
  fraud: "pill pill-rust",
  guardrail: "pill pill-amber",
};

const TAG_LABEL: Record<NonNullable<TranscriptLine["tag"]>, string> = {
  disclosure: "AI DISCLOSURE",
  leverage: "VERIFIED LEVERAGE",
  concession: "TERM CHANGED",
  fraud: "FRAUD SIGNAL",
  guardrail: "NO-AUTHORITY GUARDRAIL",
};

export function TranscriptView({
  lines,
  highlight,
}: {
  lines: TranscriptLine[];
  highlight?: number[];
}) {
  const hl = new Set(highlight ?? []);
  return (
    <ol className="scroll-quiet max-h-[420px] space-y-1 overflow-y-auto pr-2">
      {lines.map((l) => {
        const isScout = l.speaker === "scout";
        const flagged = hl.has(l.index);
        return (
          <li
            id={`line-${l.index}`}
            key={l.index}
            className="scroll-mt-24 rounded-md px-2.5 py-2"
            style={flagged ? { background: "#f4ddd3" } : undefined}
          >
            <div className="flex items-center gap-2">
              <span
                className="mono text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: isScout ? "var(--rust)" : "var(--ink)" }}
              >
                {isScout ? "Scout" : "Seller"}
              </span>
              <span className="mono text-[10px] text-charcoal/40">#{l.index}</span>
              {l.tag && <span className={TAG_CLASS[l.tag]}>{TAG_LABEL[l.tag]}</span>}
            </div>
            <p
              className="mt-0.5 text-sm leading-relaxed"
              style={{ color: isScout ? "var(--charcoal)" : "#6b6459" }}
            >
              {l.text}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
