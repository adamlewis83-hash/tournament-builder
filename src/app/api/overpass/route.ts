import { NextResponse } from "next/server";
import { overpassDirect } from "@/lib/osmGolf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Overpass mirrors can be slow; allow time to fall through them.
export const maxDuration = 50;

// POST /api/overpass { query } -> { elements }
// Server-side proxy for OpenStreetMap Overpass queries (golf pins, venue
// finder). Phones on cell data get throttled or can't reach the mirrors;
// Vercel's servers can, and every user shares one well-behaved client.
export async function POST(req: Request) {
  let query: unknown;
  try {
    ({ query } = await req.json());
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (typeof query !== "string" || query.length > 4000 || !/^\s*\[out:json\]/.test(query)) {
    return NextResponse.json({ error: "bad query" }, { status: 400 });
  }
  try {
    const data = await overpassDirect(query);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "overpass unreachable" }, { status: 502 });
  }
}
