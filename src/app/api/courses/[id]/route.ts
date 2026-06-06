import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickTee(tees: any): any | null {
  const sets = [...(tees?.male ?? []), ...(tees?.female ?? [])];
  return sets.find((t) => Array.isArray(t?.holes) && t.holes.length > 0) ?? null;
}

// GET /api/courses/:id  -> normalized course { name, holes, pars[], strokeIndex[] }
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const key = process.env.GOLF_API_KEY;
  if (!key) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const { id } = await ctx.params;

  try {
    const r = await fetch(`https://api.golfcourseapi.com/v1/courses/${id}`, {
      headers: { Authorization: `Key ${key}` },
      cache: "no-store",
    });
    if (!r.ok) return NextResponse.json({ error: "upstream" }, { status: r.status });
    const data = await r.json();
    const tee = pickTee(data.tees);
    if (!tee) return NextResponse.json({ error: "no-hole-data" }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const holes = tee.holes as any[];
    const pars = holes.map((h) => Number(h.par) || 4);
    const strokeIndex = holes.map((h, i) => Number(h.handicap) || i + 1);
    const name =
      data.course_name && data.course_name !== data.club_name
        ? `${data.club_name} — ${data.course_name}`
        : data.club_name;

    return NextResponse.json({ id: data.id, name, holes: holes.length, pars, strokeIndex });
  } catch {
    return NextResponse.json({ error: "fetch-failed" }, { status: 502 });
  }
}
