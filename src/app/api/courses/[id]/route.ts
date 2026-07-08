import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickTee(tees: any): any | null {
  const sets = [...(tees?.male ?? []), ...(tees?.female ?? [])];
  return sets.find((t) => Array.isArray(t?.holes) && t.holes.length > 0) ?? null;
}

// All tee sets, flattened with gender tags and rating/slope for course-handicap math.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function allTees(tees: any): any[] {
  const out: { name: string; gender: "M" | "F"; rating: number; slope: number; par: number; yards?: number }[] = [];
  const seen = new Set<string>();
  const push = (arr: unknown[], gender: "M" | "F") => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const t of (arr as any[]) ?? []) {
      const rating = Number(t?.course_rating);
      const slope = Number(t?.slope_rating);
      const par = Number(t?.par_total);
      if (!rating || !slope || !par) continue;
      const base = String(t?.tee_name ?? "Tee").trim();
      const name = gender === "F" ? `${base} (W)` : base;
      if (seen.has(name)) continue;
      seen.add(name);
      out.push({ name, gender, rating, slope, par, yards: Number(t?.total_yards) || undefined });
    }
  };
  push(tees?.male, "M");
  push(tees?.female, "F");
  return out;
}

// GET /api/courses/:id -> { name, holes, pars[], strokeIndex[], tees[] }
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
    const json = await r.json();
    const course = json.course ?? json; // /courses/{id} wraps in { course: {...} }
    const tee = pickTee(course.tees);
    if (!tee) return NextResponse.json({ error: "no-hole-data" }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const holes = tee.holes as any[];
    const pars = holes.map((h) => Number(h.par) || 4);
    const strokeIndex = holes.map((h, i) => Number(h.handicap) || i + 1);
    const name =
      course.course_name && course.course_name !== course.club_name
        ? `${course.club_name} — ${course.course_name}`
        : course.club_name;

    return NextResponse.json({
      id: course.id,
      name,
      holes: holes.length,
      pars,
      strokeIndex,
      tees: allTees(course.tees),
    });
  } catch {
    return NextResponse.json({ error: "fetch-failed" }, { status: 502 });
  }
}
