import { redirect } from "next/navigation";

/** Requirement-specific links use the unified results state. */
export default function ReportRedirect() {
  redirect("/report");
}
