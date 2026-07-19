import type { Quote } from "@/lib/types";
import { RiskBadge } from "./RiskBadge";
import { OUTCOME_LABEL, inr } from "@/lib/format";

// Quotes arrive already ranked by the orchestrator. Effective monthly cost is the
// single comparable number (computed by @scout/contracts).
export function QuoteTable({
  quotes,
  topPickId,
  ceiling,
}: {
  quotes: Quote[];
  topPickId: string;
  ceiling: number;
}) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr
            className="mono text-left text-[11px] uppercase tracking-wide text-charcoal/55"
            style={{ borderBottom: "1px solid var(--line)" }}
          >
            <th className="px-3 py-3 font-medium">#</th>
            <th className="px-3 py-3 font-medium">Listing</th>
            <th className="px-3 py-3 text-right font-medium">Rent</th>
            <th className="px-3 py-3 text-right font-medium">Deposit</th>
            <th className="px-3 py-3 text-right font-medium">Maint.</th>
            <th className="px-3 py-3 text-right font-medium">Broker</th>
            <th className="px-3 py-3 text-right font-medium">Effective/mo</th>
            <th className="px-3 py-3 text-right font-medium">Commute</th>
            <th className="px-3 py-3 font-medium">Risk</th>
            <th className="px-3 py-3 font-medium">Outcome</th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((q, i) => {
            const top = q.listing_id === topPickId;
            const overBudget = q.effective_monthly_cost > ceiling;
            return (
              <tr
                key={q.listing_id}
                style={{
                  borderBottom: "1px solid var(--line)",
                  background: top ? "var(--sage-bg)" : "transparent",
                }}
              >
                <td className="mono px-3 py-3 text-charcoal/45">{i + 1}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink">{q.listing_name}</span>
                    {top && <span className="pill pill-sage">TOP PICK</span>}
                  </div>
                </td>
                <td className="mono px-3 py-3 text-right">{inr(q.base_rent)}</td>
                <td className="mono px-3 py-3 text-right text-charcoal/60">{inr(q.deposit)}</td>
                <td className="mono px-3 py-3 text-right text-charcoal/60">
                  {inr(q.maintenance_monthly)}
                </td>
                <td className="mono px-3 py-3 text-right text-charcoal/60">
                  {inr(q.brokerage_onetime)}
                </td>
                <td className="px-3 py-3 text-right">
                  <div
                    className="mono font-medium"
                    style={{ color: overBudget ? "var(--red)" : "var(--ink)" }}
                  >
                    {inr(q.effective_monthly_cost)}
                  </div>
                  {q.price_moved && (
                    <div className="mono text-[10px]" style={{ color: "var(--sage)" }}>
                      ↓ from {inr(q.first_quoted_effective)}
                    </div>
                  )}
                </td>
                <td className="mono px-3 py-3 text-right text-charcoal/60">
                  {q.commute_minutes != null ? `${q.commute_minutes}m` : "—"}
                </td>
                <td className="px-3 py-3">
                  <RiskBadge flag={q.risk_flag} />
                </td>
                <td className="mono px-3 py-3 text-[12px] text-charcoal/60">
                  {OUTCOME_LABEL[q.call_outcome.status]}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
