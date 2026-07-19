export const dynamic = "force-dynamic";

/** Agent IDs are public conversation identifiers, not API credentials. */
export async function GET() {
  const agentId = process.env.ELEVENLABS_INTAKE_AGENT_ID;
  if (!agentId) return Response.json({ error: "Voice intake is not configured." }, { status: 503 });
  return Response.json({ agentId }, { headers: { "cache-control": "no-store" } });
}
