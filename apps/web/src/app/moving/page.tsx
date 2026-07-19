import { redirect } from "next/navigation";

/** Moving is a supported task type inside the universal outcome flow. */
export default function MovingRedirect() {
  redirect("/delegate");
}
