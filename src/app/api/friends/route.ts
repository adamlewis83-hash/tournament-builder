import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The stored blob is either the legacy plain array of friends, or the current
// shape { friends, tombstones } — tombstones carry deletions across devices.
type Blob = { friends?: unknown[]; tombstones?: unknown[] } | unknown[];

// GET /api/friends?owner=KEY -> { friends: [...], tombstones: [...] }
export async function GET(req: Request) {
  const owner = new URL(req.url).searchParams.get("owner");
  if (!owner) return NextResponse.json({ friends: [], tombstones: [] });
  const row = await prisma.ownedFriends.findUnique({ where: { ownerId: owner } });
  const data = (row?.data ?? []) as Blob;
  if (Array.isArray(data)) return NextResponse.json({ friends: data, tombstones: [] });
  return NextResponse.json({ friends: data.friends ?? [], tombstones: data.tombstones ?? [] });
}

// PUT /api/friends  { owner, friends, tombstones } -> replace the whole blob
export async function PUT(req: Request) {
  try {
    const { owner, friends, tombstones } = await req.json();
    if (!owner || !Array.isArray(friends))
      return NextResponse.json({ error: "missing owner/friends" }, { status: 400 });
    const data = { friends, tombstones: Array.isArray(tombstones) ? tombstones : [] };
    await prisma.ownedFriends.upsert({
      where: { ownerId: owner },
      create: { ownerId: owner, data },
      update: { data },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
