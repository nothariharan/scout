import { redirect } from "next/navigation";

/** The previous real-estate intake URL remains a safe bookmark redirect. */
export default function IntakeRedirect() {
  redirect("/moving");
}
