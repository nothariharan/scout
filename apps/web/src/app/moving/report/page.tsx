import { redirect } from "next/navigation";

/** All verticals share one evidence-backed results state. */
export default function MovingReportRedirect() {
  redirect("/report");
}
