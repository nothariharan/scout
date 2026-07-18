import type { RiskFlag } from "@/lib/types";
import { RISK_LABEL } from "@/lib/format";

const CLS: Record<RiskFlag, string> = {
  verified: "pill pill-sage",
  caution: "pill pill-amber",
  high_risk: "pill pill-rust",
};

export function RiskBadge({ flag }: { flag: RiskFlag }) {
  return <span className={CLS[flag]}>{RISK_LABEL[flag].toUpperCase()}</span>;
}
