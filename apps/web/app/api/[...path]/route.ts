import type { NextRequest } from "next/server";
import { publicDemoAllows } from "@/lib/public-demo";

// Runtime reverse proxy: browser calls /api/* and this handler forwards to
// the EquityMux API. Unlike next.config rewrites (baked at build time),
// EQUITYMUX_API is read per-request — required for Docker/compose.

const apiBase = () => process.env.EQUITYMUX_API ?? "http://localhost:8000";

async function proxy(req: NextRequest, path: string[]) {
  if (
    process.env.EQUITYMUX_PUBLIC_DEMO === "true" &&
    !publicDemoAllows(req.method, path)
  ) {
    return Response.json(
      {
        detail:
          "This public research demo disables shared-state writes and private diagnostics. Compare exposure and verify receipts from the research desk.",
      },
      { status: 403 },
    );
  }
  const url = `${apiBase()}/api/${path.join("/")}${req.nextUrl.search}`;
  const upstream = await fetch(url, {
    method: req.method,
    headers: {
      "content-type": req.headers.get("content-type") ?? "application/json",
    },
    body:
      req.method === "GET" || req.method === "HEAD"
        ? undefined
        : await req.text(),
    cache: "no-store",
  });
  return new Response(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
