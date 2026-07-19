import { redirect } from "next/navigation";

/** The original intake link is the voice-first property interview. */
export default function IntakeRedirect() {
  redirect("/real-estate");
}
