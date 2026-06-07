import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sport scenes to cycle through (each → one Unsplash photo).
const QUERIES = [
  "golf course green",
  "tennis court",
  "pickleball court",
  "cornhole bean bag game",
  "ping pong table tennis",
  "volleyball court",
];

interface BgPhoto {
  url: string;
  credit: string;
  creditUrl: string;
}

let cache: { at: number; photos: BgPhoto[] } | null = null;
const TTL = 1000 * 60 * 60 * 6; // 6 hours

export async function GET() {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return NextResponse.json({ photos: [] }, { status: 503 });
  if (cache && Date.now() - cache.at < TTL) return NextResponse.json({ photos: cache.photos });

  try {
    const photos: BgPhoto[] = [];
    for (const q of QUERIES) {
      const r = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&orientation=landscape&per_page=1&content_filter=high`,
        { headers: { Authorization: `Client-ID ${key}` }, cache: "no-store" },
      );
      if (!r.ok) continue;
      const d = await r.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = d.results?.[0] as any;
      if (p?.urls?.raw) {
        photos.push({
          url: `${p.urls.raw}&w=1920&q=80&auto=format&fit=crop`,
          credit: p.user?.name ?? "Unsplash",
          creditUrl: `${p.user?.links?.html ?? "https://unsplash.com"}?utm_source=seeded&utm_medium=referral`,
        });
      }
    }
    if (photos.length) cache = { at: Date.now(), photos };
    return NextResponse.json({ photos });
  } catch {
    return NextResponse.json({ photos: [] }, { status: 502 });
  }
}
