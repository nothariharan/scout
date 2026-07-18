import { DEMO_CALLS } from "@/lib/demo-data";
import type { CallRecord, CallStreamEvent } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Live activity stream.
//
// DEMO MODE: replays the seed calls progressively so the ledger is driven by a
// real event stream (not a client-side timer). The production version keeps this
// exact SSE contract but sources events from ElevenLabs conversation webhooks +
// telephony status callbacks relayed by apps/orchestrator.

const STEP_MS = 550; // pace of transcript lines
const DIAL_MS = 700;

function sse(event: CallStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (e: CallStreamEvent) => {
        if (!closed) controller.enqueue(encoder.encode(sse(e)));
      };
      const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

      // Initial snapshot: everything queued, transcripts empty.
      const queued: CallRecord[] = DEMO_CALLS.map((c) => ({
        ...c,
        phase: "queued",
        transcript: [],
        outcome: undefined,
        quote: undefined,
      }));
      send({ type: "snapshot", calls: queued });
      await wait(400);

      // Dial + go live (parallel feel).
      for (const c of DEMO_CALLS) {
        send({ type: "phase", listing_id: c.listing_id, phase: "dialing" });
      }
      await wait(DIAL_MS);
      for (const c of DEMO_CALLS) {
        send({ type: "phase", listing_id: c.listing_id, phase: "live" });
      }

      // Round-robin transcript lines so calls advance together.
      const cursors = DEMO_CALLS.map(() => 0);
      let remaining = DEMO_CALLS.reduce((n, c) => n + c.transcript.length, 0);
      while (remaining > 0) {
        for (let i = 0; i < DEMO_CALLS.length; i++) {
          const c = DEMO_CALLS[i];
          const idx = cursors[i];
          if (idx < c.transcript.length) {
            send({ type: "line", listing_id: c.listing_id, line: c.transcript[idx] });
            cursors[i] += 1;
            remaining -= 1;

            // Last line of this call -> emit its structured outcome + complete.
            if (cursors[i] === c.transcript.length) {
              send({
                type: "outcome",
                listing_id: c.listing_id,
                outcome: c.outcome!,
                quote: c.quote,
              });
              send({ type: "phase", listing_id: c.listing_id, phase: "completed" });
            }
          }
        }
        await wait(STEP_MS);
      }

      send({ type: "done" });
      closed = true;
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
