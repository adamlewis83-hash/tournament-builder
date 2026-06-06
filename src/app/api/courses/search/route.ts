import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/courses/search?q=pinehurst  -> proxy to GolfCourseAPI search
export async function GET(req: Request) {
  const key = process.env.GOLF_API_KEY;
  if (!key) return NextResponse.json({ error: "not-configured", courses: [] }, { status: 503 });

  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ courses: [] });

  try {
    const r = await fetch(
      `https://api.golfcourseapi.com/v1/search?search_query=${encodeURIComponent(q)}`,
      { headers: { Authorization: `Key ${key}` }, cache: "no-store" },
    );
    if (!r.ok) return NextResponse.json({ error: "upstream", courses: [] }, { status: r.status });
    const data = await r.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const courses = (data.courses ?? []).slice(0, 25).map((c: any) => ({
      id: c.id,
      name:
        c.course_name && c.course_name !== c.club_name
          ? `${c.club_name} — ${c.course_name}`
          : c.club_name,
      location: [c.location?.city, c.location?.state].filter(Boolean).join(", "),
    }));
    return NextResponse.json({ courses });
  } catch {
    return NextResponse.json({ error: "fetch-failed", courses: [] }, { status: 502 });
  }
}
