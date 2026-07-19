import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ROOTS = new Set(["health", "calls", "report", "strategy", "requirements"]);

type Context = { params: { path: string[] } };

export async function GET(request: NextRequest, context: Context) {
  return proxy(request, context);
}

export async function POST(request: NextRequest, context: Context) {
  return proxy(request, context);
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: { Allow: "GET, POST, OPTIONS" } });
}

async function proxy(request: NextRequest, { params }: Context) {
  const [root, ...rest] = params.path;
  if (!root || !ALLOWED_ROOTS.has(root)) {
    return Response.json({ error: "Unknown orchestrator route" }, { status: 404 });
  }

  const base = process.env.ORCHESTRATOR_URL;
  if (!base) {
    return Response.json(
      { error: "Orchestrator is not configured. Set ORCHESTRATOR_URL for live calls." },
      { status: 503 }
    );
  }

  const destination = new URL(
    [root, ...rest].map(encodeURIComponent).join("/"),
    `${base.replace(/\/$/, "")}/`
  );
  destination.search = request.nextUrl.search;

  try {
    const upstream = await fetch(destination, {
      method: request.method,
      headers: request.method === "POST" ? { "content-type": "application/json" } : undefined,
      body: request.method === "POST" ? await request.text() : undefined,
      cache: "no-store",
    });
    const contentType = upstream.headers.get("content-type") ?? "application/json";
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { "content-type": contentType, "cache-control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "Orchestrator is unavailable. Start @scout/orchestrator and retry." },
      { status: 503 }
    );
  }
}
