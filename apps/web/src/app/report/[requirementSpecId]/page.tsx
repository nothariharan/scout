import { redirect } from "next/navigation";

/** Legacy report links no longer render rental demo data. */
export default function ReportRedirect() {
  redirect("/moving/report");
}
