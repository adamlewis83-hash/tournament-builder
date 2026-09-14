import { NextResponse } from "next/server";
import { cachedJson, DAY } from "@/lib/apiCache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SearchHit {
  id: number;
  name: string;
  location: string;
  // v1.1.0 added coordinates to course locations; optional — a few courses
  // don't have them. They power distance labels and, later, anchoring the OSM
  // greens fetch to the course instead of the phone.
  latitude?: number;
  longitude?: number;
}

// GET /api/courses/search?q=pinehurst -> proxy to GolfCourseAPI search,
// answered from the durable cache when the same thing was asked in the last
// month. The free tier allows 35 upstream calls a day for ALL of Sporos, so
// repeat questions must not spend them — and when the quota is hit, a stale
// answer still lists the course.
export async function GET(req: Request) {
  const key = process.env.GOLF_API_KEY;
  if (!key) return NextResponse.json({ error: "not-configured", courses: [] }, { status: 503 });

  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ courses: [] });

  // v2 key: v1 rows predate coordinates and would hold them back for a month.
  const hit = await cachedJson<SearchHit[]>(`searchv2:${q.toLowerCase()}`, 30 * DAY, async () => {
    const r = await fetch(
      `https://api.golfcourseapi.com/v1/search?search_query=${encodeURIComponent(q)}`,
      { headers: { Authorization: `Key ${key}` }, cache: "no-store" },
    );
    if (!r.ok) return null;
    const data = await r.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.courses ?? []).slice(0, 25).map((c: any) => ({
      id: c.id,
      name:
        c.course_name && c.course_name !== c.club_name
          ? `${c.club_name} — ${c.course_name}`
          : c.club_name,
      location: [c.location?.city, c.location?.state].filter(Boolean).join(", "),
      ...(typeof c.location?.latitude === "number" && typeof c.location?.longitude === "number"
        ? { latitude: c.location.latitude, longitude: c.location.longitude }
        : {}),
    }));
  });

  if (!hit) return NextResponse.json({ error: "upstream", courses: [] }, { status: 502 });
  return NextResponse.json({ courses: hit.data, ...(hit.stale ? { stale: true } : {}) });
}
