import { redirect } from "next/navigation";

/** Legacy intake links now enter the universal outcome flow. */
export default function IntakeRedirect() {
  redirect("/delegate");
}
