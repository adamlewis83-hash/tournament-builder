import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/profile?owner=KEY -> { data: { profile, pastRounds, aliases, savedAt } | null }
// The person you are — name, photo, handicap, starting index, past rounds,
// name merges — backed up under the library key so the app and the web read
// the same profile.
export async function GET(req: Request) {
  const owner = new URL(req.url).searchParams.get("owner");
  if (!owner) return NextResponse.json({ data: null });
  const row = await prisma.ownedProfile.findUnique({ where: { ownerId: owner } });
  return NextResponse.json({ data: row?.data ?? null });
}

// PUT /api/profile  { owner, data } -> replace this owner's profile blob
export async function PUT(req: Request) {
  try {
    const { owner, data } = await req.json();
    if (!owner || typeof data !== "object" || data === null)
      return NextResponse.json({ error: "missing owner/data" }, { status: 400 });
    await prisma.ownedProfile.upsert({
      where: { ownerId: owner },
      create: { ownerId: owner, data },
      update: { data },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
