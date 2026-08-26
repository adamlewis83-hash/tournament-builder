import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/feed/prefs?owner=KEY -> { shareActivity }
// Absent row = default true (feed visible to linked friends; opt-out in Settings).
export async function GET(req: Request) {
  const owner = new URL(req.url).searchParams.get("owner");
  if (!owner) return NextResponse.json({ error: "missing owner" }, { status: 400 });
  const row = await prisma.feedPrefs.findUnique({ where: { ownerId: owner } });
  return NextResponse.json({ shareActivity: row?.shareActivity ?? true });
}

// PUT /api/feed/prefs  { owner, shareActivity } -> { ok }
export async function PUT(req: Request) {
  try {
    const { owner, shareActivity } = (await req.json()) as {
      owner?: string;
      shareActivity?: boolean;
    };
    if (!owner || typeof shareActivity !== "boolean")
      return NextResponse.json({ error: "missing owner/shareActivity" }, { status: 400 });
    await prisma.feedPrefs.upsert({
      where: { ownerId: owner },
      create: { ownerId: owner, shareActivity },
      update: { shareActivity },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
